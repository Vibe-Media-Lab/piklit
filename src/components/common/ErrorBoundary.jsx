import React from 'react';
import '../../styles/ErrorBoundary.css';

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
                <div className="error-boundary">
                    <h2>🚫 오류가 발생했습니다.</h2>
                    <p>
                        프로그램을 실행하는 도중 문제가 발생했습니다.<br />
                        일시적인 문제일 수 있으니 새로고침을 시도해보세요.
                    </p>

                    <details>
                        {this.state.error && this.state.error.toString()}
                    </details>

                    <button onClick={this.handleReset}>
                        🔄 페이지 새로고침
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
