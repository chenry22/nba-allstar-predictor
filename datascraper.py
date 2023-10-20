from bs4 import BeautifulSoup
import requests
import pandas as pd
import numpy as np
import time
import os.path

baseURL = "https://www.basketball-reference.com/"

def get_all_star_data(years_back=11, outfile="out.csv"):
    URL = "https://www.basketball-reference.com/allstar/"

    html = requests.get(URL)

    soup = BeautifulSoup(html.content, "html.parser")
    if soup.find('div', id="content"):
        content = soup.find('div', id="content")
    else:
        print("Failed to parse CONTENT DIV")
        print("(Likely blocked for spam)")
        return
    
    if content.find('div', id="all_all_star_games_nba"):
        allstar_div = content.find('div', id="all_all_star_games_nba")
    else:
        print("Failed to parse TOP ALL STAR DIV")
        print("(Likely blocked for spam)")
        return

    table_div = allstar_div.find('div', id="div_all_star_games_nba")
    table = table_div.find_all('tr')

    years = years_back + 4
    modern = table[2:years]

    year = []
    games = []

    for rows in modern:
        data = rows.find_all('td')
        games += [data[4]]
        year += [int(data[0].text)]

    
    link_games = []
    for game in games:
        link_games += [game.find('a').get('href')]
    
    link_players = []
    player_yrs = []

    i = -1
    for link in link_games:
        i += 1
        curr = year[i]

        newURL = str(baseURL + link)
        html = requests.get(newURL)

        soup = BeautifulSoup(html.content, "html.parser")
        content = soup.find('div', id="content")
        teams = content.find_all('div', class_="table_wrapper")
        teams = teams[1:]

        for team in teams:
            table = team.find('table')
            body = table.find('tbody')
            rows = body.find_all('tr')
            for row in rows:
                if row.find('a'):
                    link_players += [str(row.find('a').get('href'))]
                    player_yrs += [int(curr)]

        # Forced to add pauses in order to comply with BBall Reference
        # bot scraping guidelines (forced to <20 get requests per min)
        print(str(i + 1) + " / " + str(len(link_games)) + " rosters constructed...")
        time.sleep(3)

    final_player_data = []

    i = -1
    for player in link_players:
        i += 1
        lookfor = str("per_game." + str(player_yrs[i]))

        player_data = []

        newURL = str(baseURL + player)
        html = requests.get(newURL)
        soup = BeautifulSoup(html.content, "html.parser")

        print(newURL)
        meta = soup.find('div', id="info")
        meta = meta.find('div', id="meta")
        name = meta.find('h1')
        name = name.find('span').string

        player_data += [str(name)]
        player_data += [str(player_yrs[i])]

        content = soup.find('div', id="content")        
        table = content.find('table', id="per_game")
        body = table.find('tbody')
        if body.find('tr', id=lookfor):
            year_stats = body.find('tr', id=lookfor)
            rows = year_stats.find_all('td')
            for row in rows:
                if row.find('a'):
                    player_data += [str(row.find('a').string)]
                else:
                    player_data += [str(row.string)]
        
        final_player_data += [player_data]

        print(str(i + 1) + " / " + str(len(link_players)) + " player stats compiled...")
        time.sleep(3)

    cols = ["Name", "All-Star Year", "Age", "Team", "League", "Position", "Games Played", "Games Started", "MPG", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P", "2P%", "eFG%", "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS"]

    df = pd.DataFrame(final_player_data)
    df.columns = cols
    df.to_csv(outfile)
    print("Finished Data Compilation. Storing in " + outfile)

checkfile = "out.csv"

if os.path.isfile(checkfile):
    print("Data file found! Reading to dataframe.")
else:
    print("Data file not found. Creating manually using datascraper.")
    print("(This could take a while due to website restrictions...)")
    get_all_star_data()
