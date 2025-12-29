import { StyleSheet, Text, View, Button } from 'react-native';
import { BasisProvider, useState, useEffect } from 'react-state-basis';

function TestContent() {
  const [count, setCount] = useState(0, "MobileCounter");
  const [redundantCount, setRedundantCount] = useState(0, "RedundantCounter");
  const [isLooping, setIsLooping] = useState(false, "LoopFlag");

  // 1. TEST: Causal Link / Redundancy
  const triggerRedundancy = () => {
    setCount(prev => prev + 1);
    setRedundantCount(prev => prev + 1);
  };

  // 2. TEST: Circuit Breaker
  useEffect(() => {
    if (isLooping) {
      setCount(prev => prev + 1);
    }
  }, [count, isLooping]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basis Mobile Audit</Text>
      
      <Text style={styles.text}>Count: {count}</Text>
      <Text style={styles.text}>Redundant: {redundantCount}</Text>

      <View style={styles.buttonContainer}>
        <Button title="Trigger Redundancy" onPress={triggerRedundancy} color="#6c5ce7" />
        <View style={{ height: 10 }} />
        <Button 
          title="Trigger Infinite Loop" 
          onPress={() => setIsLooping(true)} 
          color="#d63031" 
        />
      </View>

      <Text style={styles.footer}>Check your terminal for logs 📐</Text>
    </View>
  );
}

export default function App() {
  return (
    <BasisProvider debug={true}>
      <TestContent />
    </BasisProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  title: {
    color: '#0f0',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'monospace'
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginVertical: 5,
    fontFamily: 'monospace'
  },
  buttonContainer: {
    marginTop: 30,
    width: '100%'
  },
  footer: {
    color: '#888',
    marginTop: 40,
    fontSize: 12
  }
});