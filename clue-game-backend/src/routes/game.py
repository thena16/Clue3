from flask import Blueprint, request, jsonify
from src.models.game import Game, db
from src.game_data import suspeitos, locais, armas
from src.game_logic import choose_solution, distribute_cards
import random
import string

game_bp = Blueprint('game', __name__)

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@game_bp.route('/create-room', methods=['POST'])
def create_room():
    try:
        data = request.get_json()
        player_name = data.get('player_name')
        
        if not player_name:
            return jsonify({'error': 'Nome do jogador é obrigatório'}), 400
        
        room_code = generate_room_code()
        
        # Verificar se o código já existe
        while Game.query.filter_by(room_code=room_code).first():
            room_code = generate_room_code()
        
        # Criar jogo com apenas um jogador inicialmente
        players = [player_name]
        solution = choose_solution(suspeitos, locais, armas)
        player_hands = distribute_cards(suspeitos, locais, armas, solution, 1)
        
        game = Game(room_code, solution, players, player_hands)
        db.session.add(game)
        db.session.commit()
        
        return jsonify({
            'room_code': room_code,
            'player_name': player_name,
            'cards': player_hands[0] if player_hands else []
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/join-room', methods=['POST'])
def join_room():
    try:
        data = request.get_json()
        room_code = data.get('room_code')
        player_name = data.get('player_name')
        
        if not room_code or not player_name:
            return jsonify({'error': 'Código da sala e nome do jogador são obrigatórios'}), 400
        
        game = Game.query.filter_by(room_code=room_code).first()
        if not game:
            return jsonify({'error': 'Sala não encontrada'}), 404
        
        if game.status != 'waiting':
            return jsonify({'error': 'Jogo já iniciado ou finalizado'}), 400
        
        players = game.get_players()
        if player_name in players:
            return jsonify({'error': 'Nome de jogador já existe na sala'}), 400
        
        if len(players) >= 6:
            return jsonify({'error': 'Sala lotada (máximo 6 jogadores)'}), 400
        
        players.append(player_name)
        
        # Redistribuir cartas com o novo número de jogadores
        solution = game.get_solution()
        player_hands = distribute_cards(suspeitos, locais, armas, solution, len(players))
        
        game.players = json.dumps(players)
        game.player_hands = json.dumps(player_hands)
        db.session.commit()
        
        # Encontrar o índice do jogador atual
        player_index = players.index(player_name)
        
        return jsonify({
            'room_code': room_code,
            'player_name': player_name,
            'cards': player_hands[player_index],
            'players': players
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/start-game', methods=['POST'])
def start_game():
    try:
        data = request.get_json()
        room_code = data.get('room_code')
        
        if not room_code:
            return jsonify({'error': 'Código da sala é obrigatório'}), 400
        
        game = Game.query.filter_by(room_code=room_code).first()
        if not game:
            return jsonify({'error': 'Sala não encontrada'}), 404
        
        if game.status != 'waiting':
            return jsonify({'error': 'Jogo já iniciado ou finalizado'}), 400
        
        players = game.get_players()
        if len(players) < 2:
            return jsonify({'error': 'Mínimo de 2 jogadores necessário'}), 400
        
        game.status = 'playing'
        db.session.commit()
        
        return jsonify({
            'message': 'Jogo iniciado!',
            'players': players,
            'status': 'playing'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/make-guess', methods=['POST'])
def make_guess():
    try:
        data = request.get_json()
        room_code = data.get('room_code')
        player_name = data.get('player_name')
        guess = data.get('guess')
        
        if not all([room_code, player_name, guess]):
            return jsonify({'error': 'Todos os campos são obrigatórios'}), 400
        
        if not all(key in guess for key in ['suspect', 'location', 'weapon']):
            return jsonify({'error': 'Palpite deve conter suspeito, local e arma'}), 400
        
        game = Game.query.filter_by(room_code=room_code).first()
        if not game:
            return jsonify({'error': 'Sala não encontrada'}), 404
        
        if game.status != 'playing':
            return jsonify({'error': 'Jogo não está em andamento'}), 400
        
        players = game.get_players()
        if player_name not in players:
            return jsonify({'error': 'Jogador não está na sala'}), 400
        
        # Verificar se o jogador já fez um palpite
        guesses = game.get_guesses()
        for g in guesses:
            if g['player'] == player_name:
                return jsonify({'error': 'Jogador já fez um palpite'}), 400
        
        game.add_guess(player_name, guess)
        db.session.commit()
        
        return jsonify({'message': 'Palpite registrado com sucesso!'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/game-status/<room_code>')
def game_status(room_code):
    try:
        game = Game.query.filter_by(room_code=room_code).first()
        if not game:
            return jsonify({'error': 'Sala não encontrada'}), 404
        
        players = game.get_players()
        guesses = game.get_guesses()
        
        # Verificar se todos os jogadores fizeram seus palpites
        all_guessed = len(guesses) == len(players) and game.status == 'playing'
        
        response = {
            'room_code': room_code,
            'players': players,
            'status': game.status,
            'guesses_count': len(guesses),
            'total_players': len(players),
            'all_guessed': all_guessed
        }
        
        # Se todos fizeram palpites, incluir os resultados
        if all_guessed:
            game.status = 'finished'
            db.session.commit()
            
            solution = game.get_solution()
            results = []
            
            for guess_data in guesses:
                player = guess_data['player']
                guess = guess_data['guess']
                
                correct = (
                    guess['suspect'] == solution['suspect'] and
                    guess['location'] == solution['location'] and
                    guess['weapon'] == solution['weapon']
                )
                
                results.append({
                    'player': player,
                    'guess': guess,
                    'correct': correct
                })
            
            response.update({
                'status': 'finished',
                'solution': solution,
                'results': results
            })
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/game-data')
def game_data():
    return jsonify({
        'suspects': suspeitos,
        'locations': locais,
        'weapons': armas
    })

import json

