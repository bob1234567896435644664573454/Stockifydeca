import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"
import { Badge } from "@/components/ui/badge"

export function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicNav />
            <section className="pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-3xl">
                    <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">Legal</Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
                    <p className="text-sm text-muted-foreground mb-12">Last updated: March 2, 2026</p>

                    <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Stockify Inc. ("Stockify," "we," "us," or "our") is committed to protecting the privacy of our users, including students, teachers, and school administrators. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our financial literacy platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">2. Information We Collect</h2>
                            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following categories of information:</p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li><strong>Account Information:</strong> Name, email address, role (student/teacher), and school affiliation provided during registration.</li>
                                <li><strong>Usage Data:</strong> Trading activity, lesson progress, quiz scores, journal entries, and platform interactions.</li>
                                <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security and analytics.</li>
                                <li><strong>Authentication Data:</strong> OAuth tokens from Google or GitHub if you choose to connect those services.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">3. How We Use Your Information</h2>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>Provide and maintain the Stockify platform and services</li>
                                <li>Personalize your learning experience and AI mentor interactions</li>
                                <li>Generate analytics and reports for teachers and competition leaders</li>
                                <li>Improve our platform through aggregated, anonymized usage data</li>
                                <li>Communicate important updates about your account or our services</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">4. COPPA & FERPA Compliance</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Stockify is designed to comply with the Children's Online Privacy Protection Act (COPPA) and the Family Educational Rights and Privacy Act (FERPA). We do not knowingly collect personal information from children under 13 without verifiable parental consent or school authorization. Educational records are treated as confidential and are only shared with authorized school personnel.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">5. Data Sharing</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We do not sell, rent, or trade your personal information. We may share data with: (a) your school or teacher as part of classroom functionality; (b) service providers who help us operate the platform under strict confidentiality agreements; (c) law enforcement when required by law.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">6. Data Security</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest, row-level security policies, and regular security audits. Access to personal data is restricted to authorized personnel on a need-to-know basis.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">7. Data Retention</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We retain your data for as long as your account is active or as needed to provide services. Upon account deletion or school request, we will delete or anonymize personal data within 30 days, except where retention is required by law.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">8. Your Rights</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                You have the right to access, correct, or delete your personal information. Parents and schools may request access to or deletion of student data. To exercise these rights, contact us at privacy@stockify.app.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-3">9. Contact Us</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                If you have questions about this Privacy Policy, please contact us at privacy@stockify.app or write to: Stockify Inc., Privacy Team.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
            <PublicFooter />
        </div>
    )
}
