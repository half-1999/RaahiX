import { Component } from 'react';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg p-6">
          <Alert tone="error" title="Something went wrong">
            {this.state.message}
          </Alert>
          <Button
            className="mt-4"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.assign('/');
            }}
          >
            Go home
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
