import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList, 'Home'>>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BoardGame Legends</Text>
      <Text style={styles.subtitle}>Premium mobile board game experience</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Game', { gameId: 'demo', gameType: 'ludo' })}>
        <Text style={styles.buttonText}>Launch Demo Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    color: '#4CAF50'
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 20
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999
  },
  buttonText: {
    color: '#05060A',
    fontWeight: 'bold'
  }
});
