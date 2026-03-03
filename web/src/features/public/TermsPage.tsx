import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"
import { Badge } from "@/components/ui/badge"

export function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicNav />
            <section className="pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-3xl">
                    <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">Legal</Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-4">Terms of Service</h1>
                    <p className="text-sm text-muted-foreground mb-12">Last updated: March 2, 2026</p>

                    <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold mb-3">1. Acceptance of Terms</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                By accessing or using Stockify ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Platform. If you are under 18, you must have your parent's or guardian's permission, or your school must have authorized your use.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">2. Educational Purpose</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Stockify is an educational platform designed to teach financial literacy through simulated trading and interactive lessons. <strong>No real money is involved in any trading activity on the Platform.</strong> All portfolios, trades, and balances are simulated for educational purposes only. The Casino Math Room uses virtual chips and is designed to teach mathematical concepts about probability and expected value.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">3. Not Financial Advice</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Nothing on the Platform constitutes financial, investment, tax, or legal advice. Stockify is not a registered broker-dealer, investment adviser, or financial planner. The educational content is for informational purposes only. Always consult a qualified professional before making real financial decisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">4. User Accounts</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to update it as needed. Teachers and competition leaders are responsible for managing their classroom participants appropriately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">5. Acceptable Use</h2>
                            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>Use the Platform for any unlawful purpose</li>
                                <li>Attempt to manipulate simulated markets or exploit system vulnerabilities</li>
                                <li>Share your account credentials with others</li>
                                <li>Harass, bully, or intimidate other users</li>
                                <li>Scrape, reverse-engineer, or interfere with the Platform's operation</li>
                                <li>Use the Casino Math Room content to promote or encourage real gambling</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">6. Intellectual Property</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                All content, features, and functionality of the Platform are owned by Stockify Inc. and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">7. Market Data Disclaimer</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Market data displayed on the Platform may be delayed or simulated. We do not guarantee the accuracy, completeness, or timeliness of any market data. Market data is provided for educational purposes only and should not be relied upon for real trading decisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">8. Limitation of Liability</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Stockify is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">9. Termination</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We may suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time through your account settings. Upon termination, your right to use the Platform ceases immediately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">10. Changes to Terms</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We may update these Terms from time to time. We will notify you of material changes via email or Platform notification. Continued use after changes constitutes acceptance of the updated Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">11. Contact</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Questions about these Terms? Contact us at legal@stockify.app.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
            <PublicFooter />
        </div>
    )
}
