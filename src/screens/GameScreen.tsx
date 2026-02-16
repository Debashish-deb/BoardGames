import { View, Text, StyleSheet, Button } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function GameScreen() {
  const route = useRoute<RouteProp<MainStackParamList, 'Game'>>();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList, 'Game'>>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loading {route.params.gameType} session...</Text>
      <Text style={styles.subtitle}>Session ID: {route.params.gameId}</Text>
      <Button title="Back to lobby" onPress={() => navigation.navigate('Home')} />
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
    fontSize: 24,
    color: '#FFD54F'
  },
  subtitle: {
    marginTop: 8,
    color: '#94A3B8'
  }
});
