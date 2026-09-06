import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Delete your B3G TV account",
  description: "Request deletion of your B3G TV account and associated profile data.",
};

const deletionEmail =
  "mailto:sirrjonesproductions@gmail.com?subject=B3G%20TV%20Account%20Deletion%20Request&body=Please%20delete%20my%20B3G%20TV%20account.%0A%0AAccount%20email%3A%20%0A%0AI%20understand%20that%20deleting%20my%20B3G%20TV%20account%20does%20not%20cancel%20an%20App%20Store%20or%20Google%20Play%20subscription.";

export default function AccountDeletionPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>B3G TV</div>
        <p className={styles.eyebrow}>ACCOUNT &amp; PRIVACY</p>
        <h1>Delete your B3G TV account</h1>
        <p className={styles.intro}>
          The fastest and most secure option is inside the B3G TV mobile app:
          open <strong>Profile → My Account → Delete account</strong>. Signed-in
          requests are completed without admin approval.
        </p>

        <div className={styles.notice}>
          <strong>Already removed the app?</strong>
          <p>
            Email our support team from the address connected to your B3G TV
            account. We will verify ownership before processing the request.
          </p>
        </div>

        <a className={styles.primary} href={deletionEmail}>
          Request account deletion
        </a>
        <p className={styles.address}>sirrjonesproductions@gmail.com</p>

        <h2>What will be deleted</h2>
        <ul>
          <li>Your B3G TV authentication account and profile</li>
          <li>Your uploaded profile photo</li>
          <li>Account-linked device and subscription synchronization data</li>
        </ul>

        <div className={styles.warning}>
          <strong>Subscriptions are managed by the store.</strong>
          <p>
            Account deletion does not cancel or refund an Apple App Store or
            Google Play subscription. Cancel separately in your store account
            to prevent future billing.
          </p>
        </div>

        <p className={styles.footer}>
          B3G TV may retain limited records only where required for fraud
          prevention, security, financial, or legal obligations. See our{" "}
          <Link href="https://sites.google.com/view/b3g-tv/privacy-policy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
