// ============================================================================
// BOARDGAME LEGENDS - HOME SCREEN
// AAA Mobile Game Quality - Rovio/Clash Royale Standard
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  ImageBackground,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Types
interface GameType {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: [string, string];
  playersOnline: number;
  avgMatchTime: string;
}

interface PlayerStats {
  rating: number;
  rank: string;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  totalGames: number;
  coins: number;
  gems: number;
}

interface RecentMatch {
  id: string;
  gameType: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  ratingChange: number;
  timestamp: Date;
}

interface Tournament {
  id: string;
  name: string;
  gameType: string;
  prizePool: string;
  entryFee: number;
  startTime: Date;
  registeredPlayers: number;
  maxPlayers: number;
}

const { width, height } = Dimensions.get('window');

const GAMES: GameType[] = [
  {
    id: 'chess',
    name: 'Chess',
    icon: '♟️',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6D28D9'],
    playersOnline: 12453,
    avgMatchTime: '10-30 min',
  },
  {
    id: 'carrom',
    name: 'Carrom',
    icon: '🔴',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    playersOnline: 8932,
    avgMatchTime: '5-15 min',
  },
  {
    id: 'ludo',
    name: 'Ludo',
    icon: '🎲',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    playersOnline: 25678,
    avgMatchTime: '15-25 min',
  },
  {
    id: 'checkers',
    name: 'Checkers',
    icon: '⚫',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
    playersOnline: 5432,
    avgMatchTime: '5-10 min',
  },
];

const MOCK_STATS: PlayerStats = {
  rating: 1847,
  rank: 'Diamond III',
  wins: 342,
  losses: 128,
  draws: 45,
  winStreak: 7,
  bestWinStreak: 15,
  totalGames: 515,
  coins: 12580,
  gems: 245,
};

const MOCK_RECENT_MATCHES: RecentMatch[] = [
  { id: '1', gameType: 'chess', opponent: 'MagnusFan99', result: 'win', ratingChange: +12, timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: '2', gameType: 'carrom', opponent: 'StrikerPro', result: 'win', ratingChange: +8, timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '3', gameType: 'chess', opponent: 'GrandMaster_X', result: 'loss', ratingChange: -15, timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: '4', gameType: 'ludo', opponent: 'DiceKing', result: 'draw', ratingChange: 0, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

const MOCK_TOURNAMENTS: Tournament[] = [
  { id: '1', name: 'Weekly Chess Championship', gameType: 'chess', prizePool: '10,000 coins', entryFee: 500, startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), registeredPlayers: 64, maxPlayers: 128 },
  { id: '2', name: 'Carrom Masters Cup', gameType: 'carrom', prizePool: '5,000 coins', entryFee: 250, startTime: new Date(Date.now() + 1000 * 60 * 60 * 4), registeredPlayers: 32, maxPlayers: 64 },
];

// Animation hooks
const usePulseAnimation = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  
  return pulse;
};

const useSlideInAnimation = (delay: number = 0) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  
  return { slideAnim, opacityAnim };
};

// Components
const Header: React.FC<{ stats: PlayerStats }> = ({ stats }) => {
  const pulseAnim = usePulseAnimation();
  
  return (
    <View style={styles.header}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👑</Text>
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{stats.rank}</Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <Text style={styles.playerName}>GrandMaster_2024</Text>
            <View style={styles.ratingRow}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text style={styles.rating}>⭐ {stats.rating}</Text>
              </Animated.View>
              <View style={styles.winStreakBadge}>
                <Text style={styles.winStreakText}>🔥 {stats.winStreak}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.currencyRow}>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>🪙</Text>
            <Text style={styles.currencyValue}>{stats.coins.toLocaleString()}</Text>
          </View>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>💎</Text>
            <Text style={styles.currencyValue}>{stats.gems}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const GameCard: React.FC<{ game: GameType; index: number; onPress: () => void }> = ({ game, index, onPress }) => {
  const { slideAnim, opacityAnim } = useSlideInAnimation(index * 100);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };
  
  return (
    <Animated.View
      style={[
        styles.gameCardContainer,
        { transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim }
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={game.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gameCard}
        >
          <View style={styles.gameIconContainer}>
            <Text style={styles.gameIcon}>{game.icon}</Text>
          </View>
          <Text style={styles.gameName}>{game.name}</Text>
          <View style={styles.gameStats}>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{game.playersOnline.toLocaleString()}</Text>
            </View>
            <Text style={styles.matchTime}>⏱️ {game.avgMatchTime}</Text>
          </View>
          <TouchableOpacity style={styles.playButton}>
            <Text style={styles.playButtonText}>▶ Play Now</Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const QuickMatchButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const pulseAnim = usePulseAnimation();
  
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity style={styles.quickMatchButton} onPress={onPress}>
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickMatchGradient}
        >
          <Text style={styles.quickMatchIcon}>⚡</Text>
          <View>
            <Text style={styles.quickMatchTitle}>Quick Match</Text>
            <Text style={styles.quickMatchSubtitle}>Find opponent in 5 seconds</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const RecentMatchItem: React.FC<{ match: RecentMatch }> = ({ match }) => {
  const getResultColor = () => {
    switch (match.result) {
      case 'win': return '#10B981';
      case 'loss': return '#EF4444';
      case 'draw': return '#6B7280';
    }
  };
  
  const getResultIcon = () => {
    switch (match.result) {
      case 'win': return '✅';
      case 'loss': return '❌';
      case 'draw': return '➖';
    }
  };
  
  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  
  return (
    <View style={styles.matchItem}>
      <View style={[styles.matchResultIndicator, { backgroundColor: getResultColor() }]}>
        <Text style={styles.matchResultIcon}>{getResultIcon()}</Text>
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchGameType}>{match.gameType.charAt(0).toUpperCase() + match.gameType.slice(1)}</Text>
        <Text style={styles.matchOpponent}>vs {match.opponent}</Text>
      </View>
      <View style={styles.matchStats}>
        <Text style={[styles.ratingChange, { color: match.ratingChange >= 0 ? '#10B981' : '#EF4444' }]}>
          {match.ratingChange >= 0 ? '+' : ''}{match.ratingChange}
        </Text>
        <Text style={styles.matchTime}>{formatTime(match.timestamp)}</Text>
      </View>
    </View>
  );
};

const TournamentCard: React.FC<{ tournament: Tournament; onPress: () => void }> = ({ tournament, onPress }) => {
  const formatTime = (date: Date) => {
    const diff = date.getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };
  
  const progress = tournament.registeredPlayers / tournament.maxPlayers;
  
  return (
    <TouchableOpacity style={styles.tournamentCard} onPress={onPress}>
      <BlurView intensity={20} style={styles.tournamentBlur}>
        <View style={styles.tournamentHeader}>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <View style={styles.tournamentBadge}>
            <Text style={styles.tournamentBadgeText}>{tournament.gameType}</Text>
          </View>
        </View>
        
        <View style={styles.tournamentDetails}>
          <View style={styles.tournamentDetail}>
            <Text style={styles.tournamentDetailLabel}>🏆 Prize</Text>
            <Text style={styles.tournamentDetailValue}>{tournament.prizePool}</Text>
          </View>
          <View style={styles.tournamentDetail}>
            <Text style={styles.tournamentDetailLabel}>🎫 Entry</Text>
            <Text style={styles.tournamentDetailValue}>{tournament.entryFee} coins</Text>
          </View>
          <View style={styles.tournamentDetail}>
            <Text style={styles.tournamentDetailLabel}>⏰ Starts</Text>
            <Text style={styles.tournamentDetailValue}>{formatTime(tournament.startTime)}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {tournament.registeredPlayers}/{tournament.maxPlayers} registered
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

// Main Screen
export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);
  
  const handleGameSelect = (game: GameType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedGame(game.id);
    
    // Navigate with animation
    setTimeout(() => {
      navigation.navigate('Game', { 
        gameId: `match_${Date.now()}`, 
        gameType: game.id 
      });
      setSelectedGame(null);
    }, 300);
  };
  
  const handleQuickMatch = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    navigation.navigate('Game', { 
      gameId: `quick_${Date.now()}`, 
      gameType: randomGame.id 
    });
  };
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#05060A" />
      
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <Header stats={MOCK_STATS} />
      </Animated.View>
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        {/* Quick Match */}
        <View style={styles.section}>
          <QuickMatchButton onPress={handleQuickMatch} />
        </View>
        
        {/* Games Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Choose Your Game</Text>
          <View style={styles.gamesGrid}>
            {GAMES.map((game, index) => (
              <GameCard
                key={game.id}
                game={game}
                index={index}
                onPress={() => handleGameSelect(game)}
              />
            ))}
          </View>
        </View>
        
        {/* Recent Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Recent Matches</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.matchesContainer}>
            {MOCK_RECENT_MATCHES.map(match => (
              <RecentMatchItem key={match.id} match={match} />
            ))}
          </View>
        </View>
        
        {/* Active Tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Active Tournaments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tournament')}>
              <Text style={styles.seeAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          {MOCK_TOURNAMENTS.map(tournament => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onPress={() => navigation.navigate('Tournament', { tournamentId: tournament.id })}
            />
          ))}
        </View>
        
        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFA500',
  },
  avatarText: {
    fontSize: 30,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    transform: [{ translateX: -30 }],
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#05060A',
  },
  rankText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginLeft: 16,
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  winStreakBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  winStreakText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  currencyIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  currencyValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    marginTop: 160,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#8B5CF6',
    fontSize: 14,
  },
  quickMatchButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  quickMatchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  quickMatchIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  quickMatchTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickMatchSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameCardContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  gameCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameIcon: {
    fontSize: 32,
  },
  gameName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gameStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  onlineText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchesContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  matchResultIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  matchResultIcon: {
    fontSize: 18,
  },
  matchInfo: {
    flex: 1,
  },
  matchGameType: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  matchOpponent: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  matchStats: {
    alignItems: 'flex-end',
  },
  ratingChange: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  tournamentCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tournamentBlur: {
    padding: 16,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  tournamentBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tournamentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tournamentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tournamentDetail: {
    alignItems: 'center',
  },
  tournamentDetailLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 2,
  },
  tournamentDetailValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
});