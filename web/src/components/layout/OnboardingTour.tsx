import { useState, useEffect } from 'react';
import Joyride, { type CallBackProps, STATUS, type Step } from 'react-joyride';
import { useTheme } from 'next-themes';

export function OnboardingTour() {
    const { theme } = useTheme();
    // Using local storage to show only once per genuine user session.
    // For demo/development purposes, we might want to trigger it manually,
    // but standard practice is check local storage.
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenStockifyTour');
        if (!hasSeenTour) {
            // Small delay to allow react-router and components to mount fully
            const timer = setTimeout(() => {
                setRun(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            content: (
                <div>
                    <h2 className="text-xl font-bold mb-2">Welcome to Stockify! 👋</h2>
                    <p className="text-muted-foreground">
                        Let's take a quick tour to help you get started with your trading simulator and classroom app.
                    </p>
                </div>
            ),
        },
        {
            target: 'aside nav button:nth-child(2)', // Targeting the Trade link
            content: 'Here is where you can find the Market Detail pages and place your paper trades.',
            placement: 'right',
        },
        {
            target: 'aside nav button:nth-child(3)', // Targeting the Portfolio link
            content: 'Track your overall performance and holdings over time in your Portfolio view.',
            placement: 'right',
        },
        {
            target: '.md\\:flex.flex-1.items-center.space-x-2.w-full button', // Target the CmdK search button in AppShell
            content: 'Pro Tip: Press ⌘K anywhere to open the command palette and quickly jump to stocks or pages!',
            placement: 'bottom',
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem('hasSeenStockifyTour', 'true');
        }
    };

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={steps}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: 'hsl(var(--primary))',
                    backgroundColor: theme === 'dark' ? 'hsl(var(--card))' : 'hsl(var(--background))',
                    arrowColor: theme === 'dark' ? 'hsl(var(--card))' : 'hsl(var(--background))',
                    textColor: theme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonNext: {
                    backgroundColor: 'hsl(var(--primary))',
                    borderRadius: '6px',
                },
                buttonBack: {
                    color: theme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
                    marginRight: 10,
                },
                buttonSkip: {
                    color: theme === 'dark' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
                }
            }}
        />
    );
}
