// ============================================================================
// BOARDGAME LEGENDS - TOURNAMENT SCREEN
// AAA Mobile Game Quality - Rovio/Clash Royale Standard
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Types
interface Tournament {
  id: string;
  name: string;
  gameType: string;
  icon: string;
  prizePool: { coins: number; gems: number };
  entryFee: { coins: number; gems: number };
  startTime: Date;
  endTime?: Date;
  status: 'upcoming' | 'registration' | 'live' | 'completed';
  format: 'single' | 'double' | 'swiss' | 'round';
  maxPlayers: number;
  registeredPlayers: number;
  currentRound?: number;
  totalRounds?: number;
  description: string;
  rules: string[];
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  rank: string;
  country: string;
  seed: number;
}

interface Match {
  id: string;
  round: number;
  player1: Player;
  player2: Player;
  winner?: Player;
  score?: string;
  status: 'pending' | 'live' | 'completed';
  startTime?: Date;
}

interface Bracket {
  rounds: number;
  matches: Match[][];
}

interface LeaderboardEntry {
  rank: number;
  player: Player;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  prize?: string;
}

// Mock data
const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    name: 'Grandmaster Chess Championship',
    gameType: 'chess',
    icon: '♟️',
    prizePool: { coins: 50000, gems: 500 },
    entryFee: { coins: 1000, gems: 0 },
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
    status: 'registration',
    format: 'single',
    maxPlayers: 64,
    registeredPlayers: 47,
    description: 'The ultimate chess tournament for grandmasters!',
    rules: ['Standard chess rules apply', '15+10 time control', 'Single elimination bracket'],
  },
  {
    id: 't2',
    name: 'Carrom Masters Cup',
    gameType: 'carrom',
    icon: '🔴',
    prizePool: { coins: 25000, gems: 250 },
    entryFee: { coins: 500, gems: 0 },
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 4),
    status: 'registration',
    format: 'double',
    maxPlayers: 32,
    registeredPlayers: 28,
    description: 'Show off your carrom skills!',
    rules: ['First to 25 points wins', 'Queen must be covered', 'Double elimination'],
  },
  {
    id: 't3',
    name: 'Ludo Legends Weekly',
    gameType: 'ludo',
    icon: '🎲',
    prizePool: { coins: 15000, gems: 150 },
    entryFee: { coins: 250, gems: 0 },
    startTime: new Date(Date.now() + 1000 * 60 * 30),
    status: 'live',
    format: 'swiss',
    maxPlayers: 128,
    registeredPlayers: 96,
    currentRound: 3,
    totalRounds: 7,
    description: 'Weekly ludo tournament with Swiss format!',
    rules: ['4 players per table', 'Top 2 advance', '7 rounds total'],
  },
  {
    id: 't4',
    name: 'Blitz Chess Blitz',
    gameType: 'chess',
    icon: '⚡',
    prizePool: { coins: 10000, gems: 100 },
    entryFee: { coins: 100, gems: 0 },
    startTime: new Date(Date.now() - 1000 * 60 * 60),
    endTime: new Date(Date.now() + 1000 * 60 * 30),
    status: 'live',
    format: 'swiss',
    maxPlayers: 256,
    registeredPlayers: 189,
    currentRound: 5,
    totalRounds: 9,
    description: 'Fast-paced blitz tournament!',
    rules: ['3+2 time control', '9 rounds Swiss', 'No draw offers before move 30'],
  },
  {
    id: 't5',
    name: 'Checkers Classic',
    gameType: 'checkers',
    icon: '⚫',
    prizePool: { coins: 5000, gems: 50 },
    entryFee: { coins: 50, gems: 0 },
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    endTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: 'completed',
    format: 'single',
    maxPlayers: 32,
    registeredPlayers: 32,
    description: 'Classic checkers tournament!',
    rules: ['Standard checkers rules', 'Single elimination'],
  },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, player: { id: 'p1', name: 'MagnusFan99', avatar: '🦁', rating: 2847, rank: 'Grandmaster', country: '🇳🇴', seed: 1 }, points: 7.5, wins: 7, losses: 0, draws: 1, prize: '20,000 coins + 200 gems' },
  { rank: 2, player: { id: 'p2', name: 'HikaruPro', avatar: '🦅', rating: 2789, rank: 'Grandmaster', country: '🇺🇸', seed: 2 }, points: 7, wins: 7, losses: 1, draws: 0, prize: '10,000 coins + 100 gems' },
  { rank: 3, player: { id: 'p3', name: 'CarlsenKing', avatar: '👑', rating: 2756, rank: 'Grandmaster', country: '🇳🇴', seed: 3 }, points: 6.5, wins: 6, losses: 1, draws: 1, prize: '5,000 coins + 50 gems' },
  { rank: 4, player: { id: 'p4', name: 'NepoMaster', avatar: '🐻', rating: 2734, rank: 'Grandmaster', country: '🇷🇺', seed: 4 }, points: 6, wins: 6, losses: 2, draws: 0, prize: '2,500 coins + 25 gems' },
  { rank: 5, player: { id: 'p5', name: 'DingLiren', avatar: '🐉', rating: 2712, rank: 'Grandmaster', country: '🇨🇳', seed: 5 }, points: 5.5, wins: 5, losses: 2, draws: 1, prize: '1,000 coins' },
  { rank: 6, player: { id: 'p6', name: 'Alireza2003', avatar: '🦊', rating: 2698, rank: 'Grandmaster', country: '🇫🇷', seed: 6 }, points: 5, wins: 5, losses: 3, draws: 0, prize: '500 coins' },
  { rank: 7, player: { id: 'p7', name: 'FabianoC', avatar: '🦉', rating: 2676, rank: 'Grandmaster', country: '🇺🇸', seed: 7 }, points: 4.5, wins: 4, losses: 3, draws: 1 },
  { rank: 8, player: { id: 'p8', name: 'AnandV', avatar: '🐯', rating: 2654, rank: 'Grandmaster', country: '🇮🇳', seed: 8 }, points: 4, wins: 4, losses: 4, draws: 0 },
];

const MOCK_BRACKET: Bracket = {
  rounds: 3,
  matches: [
    [
      { id: 'm1', round: 1, player1: { id: 'p1', name: 'Player 1', avatar: '🦁', rating: 2800, rank: 'GM', country: '🇳🇴', seed: 1 }, player2: { id: 'p8', name: 'Player 8', avatar: '🐯', rating: 2400, rank: 'IM', country: '🇮🇳', seed: 8 }, winner: undefined, status: 'pending' },
      { id: 'm2', round: 1, player1: { id: 'p4', name: 'Player 4', avatar: '🐻', rating: 2600, rank: 'GM', country: '🇷🇺', seed: 4 }, player2: { id: 'p5', name: 'Player 5', avatar: '🐉', rating: 2550, rank: 'GM', country: '🇨🇳', seed: 5 }, winner: undefined, status: 'pending' },
      { id: 'm3', round: 1, player1: { id: 'p2', name: 'Player 2', avatar: '🦅', rating: 2750, rank: 'GM', country: '🇺🇸', seed: 2 }, player2: { id: 'p7', name: 'Player 7', avatar: '🦉', rating: 2450, rank: 'IM', country: '🇺🇸', seed: 7 }, winner: undefined, status: 'pending' },
      { id: 'm4', round: 1, player1: { id: 'p3', name: 'Player 3', avatar: '👑', rating: 2700, rank: 'GM', country: '🇳🇴', seed: 3 }, player2: { id: 'p6', name: 'Player 6', avatar: '🦊', rating: 2500, rank: 'GM', country: '🇫🇷', seed: 6 }, winner: undefined, status: 'pending' },
    ],
    [
      { id: 'm5', round: 2, player1: { id: 'tbd', name: 'TBD', avatar: '❓', rating: 0, rank: '', country: '', seed: 0 }, player2: { id: 'tbd', name: 'TBD', avatar: '❓', rating: 0, rank: '', country: '', seed: 0 }, status: 'pending' },
      { id: 'm6', round: 2, player1: { id: 'tbd', name: 'TBD', avatar: '❓', rating: 0, rank: '', country: '', seed: 0 }, player2: { id: 'tbd', name: 'TBD', avatar: '❓', rating: 0, rank: '', country: '', seed: 0 }, status: 'pending' },
    ],
    [
      { id: 'm7', round: 3, player1: { id: 'tbd', name: 'TBD', avatar: '❓', rating: 0, rank: '', country: '', seed: 0 }, player2: { id: 'tbd', name: 'TBD', avatar: '❓', rating: 0, rank: '', country: '', seed: 0 }, status: 'pending' },
    ],
  ],
};

// Animation hook
const useFadeIn = (delay: number = 0) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  
  return { fadeAnim, slideAnim };
};

// Components
const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
    {isActive && <View style={styles.tabIndicator} />}
  </TouchableOpacity>
);

const TournamentCard: React.FC<{
  tournament: Tournament;
  onPress: () => void;
  index: number;
}> = ({ tournament, onPress, index }) => {
  const { fadeAnim, slideAnim } = useFadeIn(index * 100);
  
  const getStatusColor = () => {
    switch (tournament.status) {
      case 'live': return '#EF4444';
      case 'registration': return '#10B981';
      case 'upcoming': return '#F59E0B';
      case 'completed': return '#6B7280';
    }
  };
  
  const getStatusText = () => {
    switch (tournament.status) {
      case 'live': return '🔴 LIVE';
      case 'registration': return '🟢 OPEN';
      case 'upcoming': return '🟡 SOON';
      case 'completed': return '✅ DONE';
    }
  };
  
  const formatTime = (date: Date) => {
    const diff = date.getTime() - Date.now();
    if (diff < 0) return 'Started';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  const progress = tournament.registeredPlayers / tournament.maxPlayers;
  
  return (
    <Animated.View
      style={[
        styles.tournamentCardContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <BlurView intensity={20} style={styles.tournamentCard}>
          <View style={styles.tournamentHeader}>
            <View style={styles.tournamentIconContainer}>
              <Text style={styles.tournamentIcon}>{tournament.icon}</Text>
            </View>
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <View style={styles.tournamentMeta}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.statusText}>{getStatusText()}</Text>
                </View>
                <Text style={styles.formatText}>{tournament.format.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.tournamentDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>🏆 Prize</Text>
              <Text style={styles.detailValue}>
                {tournament.prizePool.coins.toLocaleString()} coins
                {tournament.prizePool.gems > 0 && ` + ${tournament.prizePool.gems} gems`}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>🎫 Entry</Text>
              <Text style={styles.detailValue}>
                {tournament.entryFee.coins > 0 ? `${tournament.entryFee.coins} coins` : 'FREE'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>⏰ {tournament.status === 'live' ? 'Ends in' : 'Starts in'}</Text>
              <Text style={styles.detailValue}>
                {tournament.status === 'live' && tournament.endTime
                  ? formatTime(tournament.endTime)
                  : formatTime(tournament.startTime)}
              </Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {tournament.registeredPlayers}/{tournament.maxPlayers} players
            </Text>
          </View>
          
          {tournament.currentRound && (
            <View style={styles.roundBadge}>
              <Text style={styles.roundText}>
                Round {tournament.currentRound}/{tournament.totalRounds}
              </Text>
            </View>
          )}
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const BracketMatch: React.FC<{ match: Match; round: number; totalRounds: number }> = ({ match, round, totalRounds }) => {
  const isLeftSide = round < totalRounds / 2;
  
  return (
    <View style={styles.bracketMatch}>
      <View style={styles.matchPlayers}>
        <View style={[styles.matchPlayer, match.winner?.id === match.player1.id && styles.matchWinner]}>
          <Text style={styles.playerAvatar}>{match.player1.avatar}</Text>
          <Text style={styles.playerName} numberOfLines={1}>{match.player1.name}</Text>
          <Text style={styles.playerRating}>{match.player1.rating}</Text>
        </View>
        <View style={styles.matchDivider}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={[styles.matchPlayer, match.winner?.id === match.player2.id && styles.matchWinner]}>
          <Text style={styles.playerAvatar}>{match.player2.avatar}</Text>
          <Text style={styles.playerName} numberOfLines={1}>{match.player2.name}</Text>
          <Text style={styles.playerRating}>{match.player2.rating}</Text>
        </View>
      </View>
      {match.score && (
        <View style={styles.matchScore}>
          <Text style={styles.scoreText}>{match.score}</Text>
        </View>
      )}
      {match.status === 'live' && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </View>
  );
};

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; isTop3: boolean }> = ({ entry, isTop3 }) => {
  const getRankStyle = () => {
    switch (entry.rank) {
      case 1: return { backgroundColor: '#FFD700', color: '#000' };
      case 2: return { backgroundColor: '#C0C0C0', color: '#000' };
      case 3: return { backgroundColor: '#CD7F32', color: '#fff' };
      default: return { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' };
    }
  };
  
  const rankStyle = getRankStyle();
  
  return (
    <View style={[styles.leaderboardRow, isTop3 && styles.leaderboardRowTop]}>
      <View style={[styles.rankBadge, { backgroundColor: rankStyle.backgroundColor }]}>
        <Text style={[styles.rankText, { color: rankStyle.color }]}>#{entry.rank}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerAvatar}>{entry.player.avatar}</Text>
        <View>
          <Text style={styles.playerName}>{entry.player.name}</Text>
          <Text style={styles.playerMeta}>{entry.player.country} • {entry.player.rating}</Text>
        </View>
      </View>
      <View style={styles.statsContainer}>
        <Text style={styles.statValue}>{entry.points}</Text>
        <Text style={styles.statLabel}>pts</Text>
      </View>
      <View style={styles.recordContainer}>
        <Text style={styles.recordText}>{entry.wins}-{entry.losses}-{entry.draws}</Text>
      </View>
      {entry.prize && (
        <View style={styles.prizeContainer}>
          <Text style={styles.prizeText}>🏆 {entry.prize}</Text>
        </View>
      )}
    </View>
  );
};

const TournamentDetailModal: React.FC<{
  tournament: Tournament | null;
  visible: boolean;
  onClose: () => void;
  onRegister: () => void;
}> = ({ tournament, visible, onClose, onRegister }) => {
  if (!tournament) return null;
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <BlurView intensity={50} style={styles.modalContent}>
          <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>{tournament.icon}</Text>
              <Text style={styles.modalTitle}>{tournament.name}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.prizeSection}>
                <Text style={styles.sectionLabel}>🏆 Prize Pool</Text>
                <Text style={styles.prizeValue}>
                  {tournament.prizePool.coins.toLocaleString()} coins
                </Text>
                {tournament.prizePool.gems > 0 && (
                  <Text style={styles.prizeValue}>+ {tournament.prizePool.gems} gems</Text>
                )}
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.sectionLabel}>📋 Details</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Format</Text>
                  <Text style={styles.infoValue}>{tournament.format.toUpperCase()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Entry Fee</Text>
                  <Text style={styles.infoValue}>
                    {tournament.entryFee.coins > 0 ? `${tournament.entryFee.coins} coins` : 'FREE'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Players</Text>
                  <Text style={styles.infoValue}>
                    {tournament.registeredPlayers}/{tournament.maxPlayers}
                  </Text>
                </View>
              </View>
              
              <View style={styles.rulesSection}>
                <Text style={styles.sectionLabel}>📜 Rules</Text>
                {tournament.rules.map((rule, i) => (
                  <Text key={i} style={styles.ruleText}>• {rule}</Text>
                ))}
              </View>
            </ScrollView>
            
            <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.registerGradient}
              >
                <Text style={styles.registerButtonText}>Register Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
};

// Main Screen
export default function TournamentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState<'tournaments' | 'bracket' | 'leaderboard'>('tournaments');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  
  const filteredTournaments = MOCK_TOURNAMENTS.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });
  
  const handleTournamentPress = (tournament: Tournament) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTournament(tournament);
    setDetailModalVisible(true);
  };
  
  const handleRegister = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDetailModalVisible(false);
    // Show success toast
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#05060A" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>🏆 Tournaments</Text>
          <Text style={styles.headerSubtitle}>Compete for glory and prizes!</Text>
        </LinearGradient>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton
          label="Tournaments"
          isActive={activeTab === 'tournaments'}
          onPress={() => setActiveTab('tournaments')}
        />
        <TabButton
          label="Bracket"
          isActive={activeTab === 'bracket'}
          onPress={() => setActiveTab('bracket')}
        />
        <TabButton
          label="Leaderboard"
          isActive={activeTab === 'leaderboard'}
          onPress={() => setActiveTab('leaderboard')}
        />
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'tournaments' && (
          <>
            {/* Filter Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
              contentContainerStyle={styles.filterContent}
            >
              {(['all', 'live', 'upcoming', 'completed'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Tournament Cards */}
            {filteredTournaments.map((tournament, index) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onPress={() => handleTournamentPress(tournament)}
                index={index}
              />
            ))}
          </>
        )}
        
        {activeTab === 'bracket' && (
          <View style={styles.bracketContainer}>
            <Text style={styles.bracketTitle}>Tournament Bracket</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.bracket}>
                {MOCK_BRACKET.matches.map((roundMatches, roundIndex) => (
                  <View key={roundIndex} style={styles.bracketRound}>
                    <Text style={styles.roundTitle}>Round {roundIndex + 1}</Text>
                    {roundMatches.map((match) => (
                      <BracketMatch
                        key={match.id}
                        match={match}
                        round={roundIndex}
                        totalRounds={MOCK_BRACKET.rounds}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        
        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardContainer}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>🏆 Grandmaster Chess Championship</Text>
              <Text style={styles.leaderboardSubtitle}>Final Standings</Text>
            </View>
            
            <View style={styles.leaderboardTable}>
              <View style={styles.leaderboardHeaderRow}>
                <Text style={styles.headerCellRank}>#</Text>
                <Text style={styles.headerCellPlayer}>Player</Text>
                <Text style={styles.headerCellPoints}>Pts</Text>
                <Text style={styles.headerCellRecord}>W-L-D</Text>
              </View>
              
              {MOCK_LEADERBOARD.map((entry) => (
                <LeaderboardRow
                  key={entry.player.id}
                  entry={entry}
                  isTop3={entry.rank <= 3}
                />
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* Detail Modal */}
      <TournamentDetailModal
        tournament={selectedTournament}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onRegister={handleRegister}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  header: {
    paddingTop: 50,
  },
  headerGradient: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '30%',
    right: '30%',
    height: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  filterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tournamentCardContainer: {
    marginBottom: 16,
  },
  tournamentCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tournamentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tournamentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tournamentIcon: {
    fontSize: 28,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  formatText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  tournamentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressSection: {
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
  roundBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roundText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bracketContainer: {
    padding: 8,
  },
  bracketTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bracket: {
    flexDirection: 'row',
  },
  bracketRound: {
    marginRight: 24,
    justifyContent: 'center',
  },
  roundTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  bracketMatch: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: 180,
  },
  matchPlayers: {
    marginBottom: 8,
  },
  matchPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  matchWinner: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  playerAvatar: {
    fontSize: 20,
    marginRight: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  playerRating: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  matchDivider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  vsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
  matchScore: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
    borderRadius: 4,
  },
  scoreText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  leaderboardContainer: {
    padding: 8,
  },
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaderboardSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 4,
  },
  leaderboardTable: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  leaderboardHeaderRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCellRank: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    width: 40,
  },
  headerCellPlayer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    flex: 1,
  },
  headerCellPoints: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    width: 50,
    textAlign: 'center',
  },
  headerCellRecord: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    width: 60,
    textAlign: 'center',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  leaderboardRowTop: {
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  statsContainer: {
    width: 50,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  recordContainer: {
    width: 60,
    alignItems: 'center',
  },
  recordText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  prizeContainer: {
    position: 'absolute',
    right: 8,
  },
  prizeText: {
    color: '#FFD700',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: height * 0.8,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalBody: {
    padding: 20,
  },
  prizeSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  prizeValue: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rulesSection: {
    marginBottom: 20,
  },
  ruleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  registerButton: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  registerGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});