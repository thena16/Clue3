import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Users, Play, Trophy, Eye } from 'lucide-react'
import './App.css'

const API_BASE_URL = 'https://xlhyimcjjn7y.manus.space/api/game'

function App() {
  const [gameState, setGameState] = useState('menu') // menu, lobby, playing, results
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [gameData, setGameData] = useState(null)
  const [playerCards, setPlayerCards] = useState([])
  const [players, setPlayers] = useState([])
  const [guess, setGuess] = useState({ suspect: '', location: '', weapon: '' })
  const [gameResults, setGameResults] = useState(null)
  const [loading, setLoading] = useState(false)

  // Carregar dados do jogo (suspeitos, locais, armas)
  useEffect(() => {
    fetch(`${API_BASE_URL}/game-data`)
      .then(res => res.json())
      .then(data => setGameData(data))
      .catch(err => console.error('Erro ao carregar dados do jogo:', err))
  }, [])

  const createRoom = async () => {
    if (!playerName.trim()) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: playerName })
      })
      const data = await response.json()
      if (response.ok) {
        setRoomCode(data.room_code)
        setPlayerCards(data.cards)
        setPlayers([playerName])
        setGameState('lobby')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Erro ao criar sala: ' + err.message)
    }
    setLoading(false)
  }

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, player_name: playerName })
      })
      const data = await response.json()
      if (response.ok) {
        setPlayerCards(data.cards)
        setPlayers(data.players)
        setGameState('lobby')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Erro ao entrar na sala: ' + err.message)
    }
    setLoading(false)
  }

  const startGame = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode })
      })
      const data = await response.json()
      if (response.ok) {
        setGameState('playing')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Erro ao iniciar jogo: ' + err.message)
    }
    setLoading(false)
  }

  const makeGuess = async () => {
    if (!guess.suspect || !guess.location || !guess.weapon) {
      alert('Selecione suspeito, local e arma')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/make-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room_code: roomCode, 
          player_name: playerName, 
          guess: guess 
        })
      })
      const data = await response.json()
      if (response.ok) {
        alert('Palpite enviado! Aguarde os outros jogadores.')
        checkGameStatus()
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Erro ao enviar palpite: ' + err.message)
    }
    setLoading(false)
  }

  const checkGameStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/game-status/${roomCode}`)
      const data = await response.json()
      if (response.ok && data.status === 'finished') {
        setGameResults(data)
        setGameState('results')
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err)
    }
  }

  // Verificar status do jogo periodicamente quando estiver jogando
  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(checkGameStatus, 3000)
      return () => clearInterval(interval)
    }
  }, [gameState, roomCode])

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8">🕵️ Jogo Clue Online</h1>
        
        {gameState === 'menu' && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Bem-vindo ao Clue!</CardTitle>
              <CardDescription>Entre com seu nome para começar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Seu nome"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <div className="space-y-2">
                <Button 
                  onClick={createRoom} 
                  disabled={loading || !playerName.trim()}
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Criar Sala
                </Button>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Código da sala"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                  />
                  <Button 
                    onClick={joinRoom}
                    disabled={loading || !playerName.trim() || !roomCode.trim()}
                  >
                    Entrar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {gameState === 'lobby' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sala: {roomCode}</CardTitle>
                <CardDescription>Aguardando jogadores...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {players.map((player, index) => (
                    <Badge key={index} variant="secondary">
                      {player}
                    </Badge>
                  ))}
                </div>
                <Button 
                  onClick={startGame}
                  disabled={loading || players.length < 2}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Jogo ({players.length}/6 jogadores)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suas Cartas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {playerCards.map((card, index) => (
                    <Badge key={index} variant="outline">
                      {card}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Faça seu Palpite</CardTitle>
                <CardDescription>Escolha um suspeito, local e arma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Suspeito:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {gameData.suspects.map((suspect) => (
                      <Button
                        key={suspect}
                        variant={guess.suspect === suspect ? "default" : "outline"}
                        onClick={() => setGuess({...guess, suspect})}
                        className="text-sm"
                      >
                        {suspect}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Local:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {gameData.locations.map((location) => (
                      <Button
                        key={location}
                        variant={guess.location === location ? "default" : "outline"}
                        onClick={() => setGuess({...guess, location})}
                        className="text-sm"
                      >
                        {location}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Arma:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {gameData.weapons.map((weapon) => (
                      <Button
                        key={weapon}
                        variant={guess.weapon === weapon ? "default" : "outline"}
                        onClick={() => setGuess({...guess, weapon})}
                        className="text-sm"
                      >
                        {weapon}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={makeGuess}
                  disabled={loading || !guess.suspect || !guess.location || !guess.weapon}
                  className="w-full"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Enviar Palpite
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suas Cartas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {playerCards.map((card, index) => (
                    <Badge key={index} variant="outline">
                      {card}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'results' && gameResults && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trophy className="mr-2 h-5 w-5 inline" />
                Resultados do Jogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">Solução Correta:</h3>
                <p className="text-green-700">
                  <strong>Suspeito:</strong> {gameResults.solution.suspect}<br/>
                  <strong>Local:</strong> {gameResults.solution.location}<br/>
                  <strong>Arma:</strong> {gameResults.solution.weapon}
                </p>
              </div>

              <div>
                <h3 className="font-bold mb-2">Palpites dos Jogadores:</h3>
                {gameResults.results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg mb-2 ${
                      result.correct ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                    } border`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{result.player}</span>
                      <Badge variant={result.correct ? "default" : "destructive"}>
                        {result.correct ? "✓ Correto" : "✗ Incorreto"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {result.guess.suspect} • {result.guess.location} • {result.guess.weapon}
                    </p>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => {
                  setGameState('menu')
                  setRoomCode('')
                  setPlayerCards([])
                  setPlayers([])
                  setGuess({ suspect: '', location: '', weapon: '' })
                  setGameResults(null)
                }}
                className="w-full"
              >
                Jogar Novamente
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App

