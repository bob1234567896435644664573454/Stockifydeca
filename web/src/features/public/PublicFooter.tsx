import { TrendingUp } from "lucide-react"

export function PublicFooter() {
    return (
        <footer className="border-t py-16 px-4 bg-background">
            <div className="container mx-auto max-w-7xl">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-xl">Stockify</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The school-ready financial literacy platform. Learn investing by doing — safely and transparently.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="/features" className="hover:text-foreground transition-colors">Features</a></li>
                            <li><a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                            <li><a href="/resources" className="hover:text-foreground transition-colors">Resources</a></li>
                            <li><a href="/about" className="hover:text-foreground transition-colors">About</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                            <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Contact</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>hello@stockify.app</li>
                            <li>For schools and districts</li>
                        </ul>
                    </div>
                </div>
                <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Stockify Inc. All rights reserved.</p>
                    <p className="text-xs text-muted-foreground">Stockify is an educational platform. No real money is involved. Not financial advice.</p>
                </div>
            </div>
        </footer>
    )
}
