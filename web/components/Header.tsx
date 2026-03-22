export function Header() {
    return (
        <header
            className="flex items-center justify-between px-6 py-3 border-b"
            style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-raised)",
            }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{
                        background:
                            "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
                        color: "white",
                    }}
                >
                    D
                </div>
                <div>
                    <h1 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        Dimensity
                    </h1>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        Abstract Testnet • AI Agent
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#22c55e" }}
                />
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    Connected
                </span>
            </div>
        </header>
    );
}
