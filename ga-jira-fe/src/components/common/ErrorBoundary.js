import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.title}>Something went wrong</Text>
              <Text variant="bodyMedium" style={styles.message}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>
              {__DEV__ && this.state.errorInfo && (
                <ScrollView style={styles.stack}>
                  <Text variant="bodySmall" style={styles.stackText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                </ScrollView>
              )}
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={this.handleReset}>
                Try Again
              </Button>
            </Card.Actions>
          </Card>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F4F5F7',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginBottom: 8,
    color: '#DE350B',
  },
  message: {
    marginBottom: 12,
  },
  stack: {
    maxHeight: 200,
    backgroundColor: '#F4F5F7',
    padding: 8,
    borderRadius: 4,
  },
  stackText: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
});

export default ErrorBoundary;
