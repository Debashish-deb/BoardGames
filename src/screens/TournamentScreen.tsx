import { View, Text, StyleSheet } from 'react-native';

export default function TournamentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tournament Lobby</Text>
      <Text style={styles.body}>Planning multi-stage competitions right now...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#05060A'
  },
  title: {
    fontSize: 28,
    color: '#4CAF50'
  },
  body: {
    marginTop: 12,
    color: '#94A3B8'
  }
});
