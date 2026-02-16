import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/screens/HomeScreen';
import GameScreen from '@/screens/GameScreen';
import TournamentScreen from '@/screens/TournamentScreen';

export type MainStackParamList = {
  Home: undefined;
  Game: { gameId: string; gameType: 'ludo' | 'carrom' | 'chess' };
  Tournament: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="Tournament" component={TournamentScreen} />
    </Stack.Navigator>
  );
}
