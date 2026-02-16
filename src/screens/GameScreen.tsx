// ============================================================================
// BOARDGAME LEGENDS - GAME SCREEN
// AAA Mobile Game Quality - Rovio/Clash Royale Standard
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  Vibration,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width - 32, height * 0.5);
const SQUARE_SIZE = BOARD_SIZE / 8;

// Types
interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  rank: string;
  country: string;
  isOnline: boolean;
}

interface GameState {
  fen: string;
  turn: 'w' | 'b';
  status: 'playing' | 'check' | 'checkmate' | 'draw' | 'resigned' | 'timeout';
  moveHistory: string[];
  capturedPieces: { white: string[]; black: string[] };
}

interface ClockState {
  white: number;
  black: number;
  isRunning: boolean;
}

interface Move {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  san: string;
  isCheck: boolean;
  isCheckmate: boolean;
}

// Piece symbols
const PIECES: Record<string, { white: string; black: string }> = {
  k: { white: '♔', black: '♚' },
  q: { white: '♕', black: '♛' },
  r: { white: '♖', black: '♜' },
  b: { white: '♗', black: '♝' },
  n: { white: '♘', black: '♞' },
  p: { white: '♙', black: '♟' },
};

// Mock data
const MOCK_OPPONENT: Player = {
  id: 'opp_123',
  name: 'GrandMaster_X',
  avatar: '🦁',
  rating: 2156,
  rank: 'Grandmaster',
  country: '🇳🇴',
  isOnline: true,
};

const MOCK_SELF: Player = {
  id: 'self_456',
  name: 'You',
  avatar: '🦅',
  rating: 1847,
  rank: 'Diamond III',
  country: '🇺🇸',
  isOnline: true,
};

// Components
const PlayerBar: React.FC<{
  player: Player;
  clock: number;
  isActive: boolean;
  isLowTime: boolean;
  capturedPieces: string[];
  position: 'top' | 'bottom';
}> = ({ player, clock, isActive, isLowTime, capturedPieces, position }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isActive && isLowTime) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isActive, isLowTime]);
  
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const formatTimePrecise = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const deciseconds = Math.floor((ms % 1000) / 100);
    return `${seconds}.${deciseconds}`;
  };
  
  return (
    <View style={[styles.playerBar, position === 'top' ? styles.playerBarTop : styles.playerBarBottom]}>
      <View style={styles.playerInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{player.avatar}</Text>
          {player.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.playerDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.country}>{player.country}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {player.rating}</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{player.rank}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <Animated.View
        style={[
          styles.clockContainer,
          isActive && styles.clockActive,
          isLowTime && styles.clockLowTime,
          { transform: [{ scale: isLowTime && isActive ? pulseAnim : 1 }] },
        ]}
      >
        <Text style={[styles.clockText, isLowTime && styles.clockTextLowTime]}>
          {clock < 10000 ? formatTimePrecise(clock) : formatTime(clock)}
        </Text>
      </Animated.View>
      
      {capturedPieces.length > 0 && (
        <View style={styles.capturedPieces}>
          {capturedPieces.slice(0, 4).map((piece, i) => (
            <Text key={i} style={styles.capturedPiece}>{PIECES[piece]?.white || piece}</Text>
          ))}
          {capturedPieces.length > 4 && (
            <Text style={styles.capturedPieceMore}>+{capturedPieces.length - 4}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const ChessSquare: React.FC<{
  file: number;
  rank: number;
  piece: string | null;
  pieceColor: 'w' | 'b' | null;
  isSelected: boolean;
  isValidMove: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  onPress: () => void;
}> = ({ file, rank, piece, pieceColor, isSelected, isValidMove, isLastMove, isCheck, onPress }) => {
  const isLight = (file + rank) % 2 === 1;
  
  const getBackgroundColor = () => {
    if (isCheck) return 'rgba(239, 68, 68, 0.8)';
    if (isSelected) return 'rgba(139, 92, 246, 0.8)';
    if (isLastMove) return 'rgba(251, 191, 36, 0.6)';
    return isLight ? '#F0D9B5' : '#B58863';
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.square,
        { backgroundColor: getBackgroundColor() },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {piece && pieceColor && (
        <Text style={styles.piece}>
          {PIECES[piece]?.[pieceColor === 'w' ? 'white' : 'black']}
        </Text>
      )}
      {isValidMove && !piece && <View style={styles.validMoveDot} />}
      {isValidMove && piece && <View style={styles.validMoveCapture} />}
    </TouchableOpacity>
  );
};

const ChessBoard: React.FC<{
  fen: string;
  selectedSquare: string | null;
  validMoves: string[];
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  onSquarePress: (square: string) => void;
}> = ({ fen, selectedSquare, validMoves, lastMove, checkSquare, onSquarePress }) => {
  const parseFen = (fenStr: string) => {
    const parts = fenStr.split(' ');
    const rows = parts[0].split('/');
    const board: (string | null)[][] = [];
    
    for (const row of rows) {
      const boardRow: (string | null)[] = [];
      for (const char of row) {
        if (/\d/.test(char)) {
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push(null);
          }
        } else {
          boardRow.push(char);
        }
      }
      board.push(boardRow);
    }
    
    return board;
  };
  
  const board = parseFen(fen);
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
  return (
    <View style={styles.boardContainer}>
      <View style={styles.board}>
        {board.map((row, rankIndex) => (
          <View key={rankIndex} style={styles.boardRow}>
            {row.map((piece, fileIndex) => {
              const square = `${files[fileIndex]}${8 - rankIndex}`;
              const pieceType = piece ? piece.toLowerCase() : null;
              const pieceColor = piece ? (piece === piece.toUpperCase() ? 'w' : 'b') : null;
              
              return (
                <ChessSquare
                  key={square}
                  file={fileIndex}
                  rank={rankIndex}
                  piece={pieceType}
                  pieceColor={pieceColor}
                  isSelected={selectedSquare === square}
                  isValidMove={validMoves.includes(square)}
                  isLastMove={lastMove?.from === square || lastMove?.to === square}
                  isCheck={checkSquare === square}
                  onPress={() => onSquarePress(square)}
                />
              );
            })}
          </View>
        ))}
      </View>
      
      {/* File labels */}
      <View style={styles.fileLabels}>
        {files.map((f, i) => (
          <Text key={f} style={[styles.label, styles.fileLabel]}>{f}</Text>
        ))}
      </View>
      
      {/* Rank labels */}
      <View style={styles.rankLabels}>
        {[8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
          <Text key={r} style={[styles.label, styles.rankLabel]}>{r}</Text>
        ))}
      </View>
    </View>
  );
};

const MoveHistory: React.FC<{ moves: string[] }> = ({ moves }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [moves]);
  
  const pairedMoves: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairedMoves.push([moves[i], moves[i + 1]]);
  }
  
  return (
    <View style={styles.moveHistoryContainer}>
      <Text style={styles.moveHistoryTitle}>📜 Moves</Text>
      <ScrollView
        ref={scrollViewRef}
        style={styles.moveHistoryScroll}
        showsVerticalScrollIndicator={false}
      >
        {pairedMoves.map(([white, black], i) => (
          <View key={i} style={styles.moveRow}>
            <Text style={styles.moveNumber}>{i + 1}.</Text>
            <Text style={styles.moveText}>{white}</Text>
            {black && <Text style={styles.moveText}>{black}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const GameControls: React.FC<{
  onDrawOffer: () => void;
  onResign: () => void;
  onTakeback: () => void;
  onFlipBoard: () => void;
  onSettings: () => void;
}> = ({ onDrawOffer, onResign, onTakeback, onFlipBoard, onSettings }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <View style={styles.controlsContainer}>
      <TouchableOpacity style={styles.controlButton} onPress={onFlipBoard}>
        <Text style={styles.controlIcon}>🔄</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onTakeback}>
        <Text style={styles.controlIcon}>↩️</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onDrawOffer}>
        <Text style={styles.controlIcon}>🤝</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onResign}>
        <Text style={styles.controlIcon}>🏳️</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onSettings}>
        <Text style={styles.controlIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
};

const GameOverModal: React.FC<{
  visible: boolean;
  result: string;
  reason: string;
  ratingChange: number;
  onNewGame: () => void;
  onRematch: () => void;
  onHome: () => void;
}> = ({ visible, result, reason, ratingChange, onNewGame, onRematch, onHome }) => {
  const getResultColor = () => {
    if (result === '1-0') return '#10B981';
    if (result === '0-1') return '#EF4444';
    return '#6B7280';
  };
  
  const getResultText = () => {
    if (result === '1-0') return 'Victory! 🎉';
    if (result === '0-1') return 'Defeat 😔';
    return 'Draw 🤝';
  };
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <BlurView intensity={50} style={styles.modalContent}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            <Text style={[styles.resultTitle, { color: getResultColor() }]}>
              {getResultText()}
            </Text>
            <Text style={styles.resultReason}>{reason}</Text>
            
            <View style={styles.ratingChangeContainer}>
              <Text style={styles.ratingChangeLabel}>Rating Change</Text>
              <Text style={[styles.ratingChangeValue, { color: ratingChange >= 0 ? '#10B981' : '#EF4444' }]}>
                {ratingChange >= 0 ? '+' : ''}{ratingChange}
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={onNewGame}>
                <Text style={styles.modalButtonText}>New Game</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={onRematch}>
                <Text style={styles.modalButtonText}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={onHome}>
                <Text style={styles.modalButtonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
};

// Main Screen
export default function GameScreen() {
  const route = useRoute<RouteProp<any, 'Game'>>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  //const { gameType, gameId } = route.params; (should be activated later for true game screen)
  
  // Game state
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState({ result: '', reason: '', ratingChange: 0 });
  const [boardFlipped, setBoardFlipped] = useState(false);
  
  // Clock state
  const [whiteTime, setWhiteTime] = useState(300000);
  const [blackTime, setBlackTime] = useState(300000);
  const [clockRunning, setClockRunning] = useState(false);
  
  // Clock interval
  useEffect(() => {
    if (!clockRunning) return;
    
    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 100) {
            handleTimeout('w');
            return 0;
          }
          return t - 100;
        });
      } else {
        setBlackTime(t => {
          if (t <= 100) {
            handleTimeout('b');
            return 0;
          }
          return t - 100;
        });
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [turn, clockRunning]);
  
  const handleTimeout = (color: 'w' | 'b') => {
    setClockRunning(false);
    setGameOver(true);
    setGameResult({
      result: color === 'w' ? '0-1' : '1-0',
      reason: `${color === 'w' ? 'White' : 'Black'} ran out of time`,
      ratingChange: color === 'w' ? -15 : 15,
    });
  };
  
  const handleSquarePress = (square: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!selectedSquare) {
      // Select piece
      setSelectedSquare(square);
      // Calculate valid moves (mock)
      setValidMoves(['e4', 'e3', 'd4', 'f4']);
    } else if (selectedSquare === square) {
      // Deselect
      setSelectedSquare(null);
      setValidMoves([]);
    } else if (validMoves.includes(square)) {
      // Make move
      makeMove(selectedSquare, square);
    } else {
      // Change selection
      setSelectedSquare(square);
      setValidMoves(['e4', 'e3', 'd4', 'f4']);
    }
  };
  
  const makeMove = (from: string, to: string) => {
    // Mock move execution
    setLastMove({ from, to });
    setMoveHistory(prev => [...prev, `${from}-${to}`]);
    setSelectedSquare(null);
    setValidMoves([]);
    setTurn(t => t === 'w' ? 'b' : 'w');
    
    // Start clock on first move
    if (!clockRunning) {
      setClockRunning(true);
    }
    
    // Randomly trigger check
    if (Math.random() > 0.8) {
      setCheckSquare('e1');
    } else {
      setCheckSquare(null);
    }
  };
  
  const handleDrawOffer = () => {
    Alert.alert(
      'Offer Draw',
      'Do you want to offer a draw?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Offer', 
          onPress: () => {
            // Mock: opponent accepts
            setTimeout(() => {
              setGameOver(true);
              setGameResult({ result: '1/2-1/2', reason: 'Draw by agreement', ratingChange: 0 });
            }, 1000);
          }
        },
      ]
    );
  };
  
  const handleResign = () => {
    Alert.alert(
      'Resign',
      'Are you sure you want to resign?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resign', 
          style: 'destructive',
          onPress: () => {
            setClockRunning(false);
            setGameOver(true);
            setGameResult({ 
              result: turn === 'w' ? '0-1' : '1-0', 
              reason: 'White resigned', 
              ratingChange: -15 
            });
          }
        },
      ]
    );
  };
  
  const handleTakeback = () => {
    if (moveHistory.length === 0) return;
    
    Alert.alert(
      'Request Takeback',
      'Ask opponent to take back last move?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request', 
          onPress: () => {
            // Mock: opponent accepts
            setTimeout(() => {
              setMoveHistory(prev => prev.slice(0, -1));
              setTurn(t => t === 'w' ? 'b' : 'w');
            }, 1000);
          }
        },
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#05060A" />
      
      {/* Opponent Bar */}
      <PlayerBar
        player={MOCK_OPPONENT}
        clock={turn === 'b' && clockRunning ? blackTime : blackTime}
        isActive={turn === 'b'}
        isLowTime={blackTime < 10000}
        capturedPieces={capturedBlack}
        position="top"
      />
      
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Chess Board */}
        <View style={styles.boardWrapper}>
          <ChessBoard
            fen={fen}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            lastMove={lastMove}
            checkSquare={checkSquare}
            onSquarePress={handleSquarePress}
          />
        </View>
        
        {/* Move History */}
        <MoveHistory moves={moveHistory} />
      </View>
      
      {/* Controls */}
      <GameControls
        onDrawOffer={handleDrawOffer}
        onResign={handleResign}
        onTakeback={handleTakeback}
        onFlipBoard={() => setBoardFlipped(!boardFlipped)}
        onSettings={() => {}}
      />
      
      {/* Player Bar */}
      <PlayerBar
        player={MOCK_SELF}
        clock={turn === 'w' && clockRunning ? whiteTime : whiteTime}
        isActive={turn === 'w'}
        isLowTime={whiteTime < 10000}
        capturedPieces={capturedWhite}
        position="bottom"
      />
      
      {/* Game Over Modal */}
      <GameOverModal
        visible={gameOver}
        result={gameResult.result}
        reason={gameResult.reason}
        ratingChange={gameResult.ratingChange}
        onNewGame={() => navigation.navigate('Home')}
        onRematch={() => {
          setGameOver(false);
          setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
          setMoveHistory([]);
          setWhiteTime(300000);
          setBlackTime(300000);
          setClockRunning(false);
        }}
        onHome={() => navigation.navigate('Home')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
  playerBarTop: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  playerBarBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    fontSize: 32,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#05060A',
  },
  playerDetails: {
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  country: {
    fontSize: 14,
    marginLeft: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rating: {
    color: '#FFD700',
    fontSize: 14,
  },
  rankBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  rankText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clockContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  clockActive: {
    backgroundColor: '#10B981',
  },
  clockLowTime: {
    backgroundColor: '#EF4444',
  },
  clockText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  clockTextLowTime: {
    color: '#fff',
  },
  capturedPieces: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  capturedPiece: {
    fontSize: 16,
    marginLeft: -4,
  },
  capturedPieceMore: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardContainer: {
    position: 'relative',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  validMoveDot: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  validMoveCapture: {
    position: 'absolute',
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
  },
  fileLabels: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SQUARE_SIZE / 2,
  },
  rankLabels: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -20,
    justifyContent: 'space-around',
    paddingVertical: SQUARE_SIZE / 2,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fileLabel: {
    width: SQUARE_SIZE,
    textAlign: 'center',
  },
  rankLabel: {
    height: SQUARE_SIZE,
    textAlign: 'center',
    lineHeight: SQUARE_SIZE,
  },
  moveHistoryContainer: {
    width: 100,
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 8,
  },
  moveHistoryTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moveHistoryScroll: {
    maxHeight: BOARD_SIZE - 40,
  },
  moveRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  moveNumber: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    width: 24,
  },
  moveText: {
    color: '#fff',
    fontSize: 11,
    width: 35,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  controlIcon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultReason: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 24,
  },
  ratingChangeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingChangeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  ratingChangeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#8B5CF6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});