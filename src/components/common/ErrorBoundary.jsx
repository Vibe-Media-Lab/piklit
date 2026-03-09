import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        } else {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxWidth: '600px',
                    margin: '40px auto'
                }}>
                    <h2 style={{ color: '#e03131', marginBottom: '16px' }}>🚫 오류가 발생했습니다.</h2>
                    <p style={{ color: '#495057', marginBottom: '24px' }}>
                        프로그램을 실행하는 도중 문제가 발생했습니다.<br />
                        일시적인 문제일 수 있으니 새로고침을 시도해보세요.
                    </p>

                    <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem', color: '#666' }}>
                        {this.state.error && this.state.error.toString()}
                    </details>

                    <button
                        onClick={this.handleReset}
                        style={{
                            background: '#339af0',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        🔄 페이지 새로고침
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
