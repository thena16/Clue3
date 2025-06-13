

import random

def choose_solution(suspects, locations, weapons):
    solution_suspect = random.choice(suspects)
    solution_location = random.choice(locations)
    solution_weapon = random.choice(weapons)
    return {
        'suspect': solution_suspect,
        'location': solution_location,
        'weapon': solution_weapon
    }

def distribute_cards(suspects, locations, weapons, solution, num_players):
    all_cards = []
    for s in suspects:
        if s != solution['suspect']:
            all_cards.append(s)
    for l in locations:
        if l != solution['location']:
            all_cards.append(l)
    for w in weapons:
        if w != solution['weapon']:
            all_cards.append(w)

    random.shuffle(all_cards)

    player_hands = [[] for _ in range(num_players)]
    for i, card in enumerate(all_cards):
        player_hands[i % num_players].append(card)
    return player_hands



