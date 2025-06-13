from src import db
import json
from datetime import datetime

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_code = db.Column(db.String(10), unique=True, nullable=False)
    solution = db.Column(db.Text, nullable=False)  # JSON string
    players = db.Column(db.Text, nullable=False)  # JSON string
    player_hands = db.Column(db.Text, nullable=False)  # JSON string
    guesses = db.Column(db.Text, nullable=True)  # JSON string
    status = db.Column(db.String(20), default='waiting')  # waiting, playing, finished
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, room_code, solution, players, player_hands):
        self.room_code = room_code
        self.solution = json.dumps(solution)
        self.players = json.dumps(players)
        self.player_hands = json.dumps(player_hands)
        self.guesses = json.dumps([])
    
    def get_solution(self):
        return json.loads(self.solution)
    
    def get_players(self):
        return json.loads(self.players)
    
    def get_player_hands(self):
        return json.loads(self.player_hands)
    
    def get_guesses(self):
        return json.loads(self.guesses) if self.guesses else []
    
    def add_guess(self, player_name, guess):
        guesses = self.get_guesses()
        guesses.append({
            'player': player_name,
            'guess': guess,
            'timestamp': datetime.utcnow().isoformat()
        })
        self.guesses = json.dumps(guesses)
    
    def to_dict(self):
        return {
            'id': self.id,
            'room_code': self.room_code,
            'players': self.get_players(),
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }