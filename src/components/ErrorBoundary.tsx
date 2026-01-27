import React, { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo,
        });

        // TODO: Send to error reporting service (e.g., Sentry)
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                เกิดข้อผิดพลาด
                            </h1>
                            <p className="text-gray-600">
                                ขออภัยค่ะ เกิดข้อผิดพลาดบางอย่าง
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <p className="text-sm font-mono text-red-800 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-red-700 hover:to-orange-700 transition-all"
                            >
                                ลองอีกครั้ง
                            </button>
                            
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                            >
                                กลับหน้าหลัก
                            </button>
                        </div>

                        {import.meta.env.DEV && this.state.errorInfo && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                                    รายละเอียดเพิ่มเติม (Dev Only)
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
