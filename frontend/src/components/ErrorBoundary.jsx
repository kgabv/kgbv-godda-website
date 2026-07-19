import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 24,
          fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a"
        }} data-testid="error-boundary">
          <div style={{ maxWidth: 640, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0056B3" }}>कुछ त्रुटि हुई</h1>
            <p style={{ marginTop: 12, color: "#475569" }}>पृष्ठ लोड करते समय एक तकनीकी समस्या हुई। कृपया पुनः प्रयास करें।</p>
            <pre style={{
              marginTop: 20, padding: 16, textAlign: "left", background: "#fff",
              border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto",
              fontSize: 12, color: "#b91c1c", whiteSpace: "pre-wrap"
            }}>{String(this.state.error?.message || this.state.error || "Unknown error")}</pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
              style={{
                marginTop: 20, padding: "10px 24px", background: "#0056B3", color: "#fff",
                border: "none", borderRadius: 999, fontWeight: 600, cursor: "pointer"
              }}
              data-testid="error-retry"
            >
              मुख्य पृष्ठ पर जाएँ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
