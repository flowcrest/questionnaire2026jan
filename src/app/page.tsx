export default function Home() {
    return (
        <main>
            <h1>Survey Reward Automation System</h1>
            <p>
                This is a backend API system. Available endpoints:
            </p>
            <ul>
                <li>POST /api/webhook/tally - Tally form submissions</li>
                <li>POST /api/webhook/supabase - Supabase insert triggers</li>
            </ul>
        </main>
    );
}
