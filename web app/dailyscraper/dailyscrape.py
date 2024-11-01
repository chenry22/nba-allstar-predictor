from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import requests
import os
import pickle

from datetime import datetime

# TODO: each day, add every ranking to some ranking_history.csv (new column)

curr_year = "2025"
model = pickle.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__name__))), 'static/allstar_model.sav'), 'rb'))

teams = ["TOT", "ATL", "BOS", "BRK", "CHO", "CHI", "CLE", "DET", "IND", "MIA", 
         "MIL", "NYK", "ORL", "PHI", "TOR", "WAS", "DAL", "DEN", "GSW", "HOU", 
         "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHO", "POR", "SAC", "SAS", "UTA"]
east = ["ATL", "BOS", "BRK", "CHO", "CHI", "CLE", "DET", "IND", "MIA", 
        "MIL", "NYK", "ORL", "PHI", "TOR", "WAS"]
west = ["DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP",
        "OKC", "PHO", "POR", "SAC", "SAS", "UTA"]
teams_full = ["n/a", "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", 
              "Chicago Bulls", "Cleveland Cavaliers", "Detroit Pistons", "Indiana Pacers", "Miami Heat", 
              "Milwaukee Bucks", "New York Knicks", "Orlando Magic", "Philadelphia 76ers", "Toronto Raptors", 
              "Washington Wizards", "Dallas Mavericks", "Denver Nuggets", "Golden State Warriors", "Houston Rockets",
              "Los Angeles Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Minnesota Timberwolves", "New Orleans Pelicans",
              "Oklahoma City Thunder", "Phoenix Suns", "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Utah Jazz"]

# Helper functions
def ptsPerFGA(x):
    fga = x['FGA']
    pts = x['PTS']

    if(float(fga) == 0):
        return 0

    try:
        return float(pts) / float(fga)
    except TypeError:
        return 0

def winPercent(x, df):
    team = df[df["Team"] == x]
    if len(team["Percent"]) > 0:
        pct = team["Percent"].iloc[0]
        return pct

    return 0

def gamesStats(x, df, played):
    team = x["Team"]

    if not isinstance(team, str):
        team = team.decode('utf-8')

    games = df[df["Team"] == team]["Games"]

    if played:
        series = (82 - games) + int(x["Games Played"])
        if len(series) > 0:
            return series.iloc[0]
        else:
            return 0
    else:
        series = (82 - games) + int(x["Games Started"])
        if len(series) > 0:
            return series.iloc[0]
        else:
            return 0

def findChange(x, df):
    name = x["Name"]
    rank = int(x.name) + 1
    prev = df[df["Name"] == name]

    if prev.size > 0:
        prev = prev.iloc[0]
        prev_rank = int(prev.name) + 1
        change = prev_rank - rank

        if change == 0:
            return "="
        elif change < 0:
            return str(change)
        else:
            return "+" + str(change)

    return "n/a"



# Main functions
def updateLeaderboard(df, outfile='curr_player.csv'):
    # No null values
    df = df.reset_index(drop=True)

    features = ['Games Played', 'Games Started', 'MPG', 'FG', 'FGA',
            '3P', '3PA', '2P', '2PA', 'FT',
            'FTA', 'ORB', 'DRB', 'TRB', 'AST',
            'STL', 'BLK', 'PTS', 'TOV', 'Previous Times All-Star',
            'Win Percent', 'PTS/FGA']
    
    stats = df[features]

    log_model = model
    predictions = log_model.predict_proba(stats)[:, 1]

    allstar_bias = stats
    allstar_bias['Previous Times All-Star'].values[:] = 0
    bias_predictions = log_model.predict_proba(allstar_bias)[:, 1]

    fix_index = pd.to_numeric(df['MPG']) < 10.0
    predictions[fix_index] = 0.0
    bias_predictions[fix_index] = 0.0

    predictions = predictions * 100
    predictions = np.round(predictions, decimals=2)

    bias_predictions = bias_predictions * 100
    bias_predictions = np.round(bias_predictions, decimals=2)
 
    full = df
    full["% All Star"] = predictions
    full["Unbiased % All Star"] = bias_predictions
    full = full.sort_values(by=['% All Star'], ascending=False)

    path = os.path.dirname(os.path.dirname(os.path.realpath(__name__)))
    path = os.path.join(path, "static/data/")
    full = full.reset_index(drop=True)
    unbiased = full

    if os.path.exists(os.path.join(path, 'curr_player.csv')):
        temp = pd.read_csv(os.path.join(path, 'curr_player.csv'))
        full["Change"] = full.apply(lambda x : findChange(x, temp), axis=1)
    else:
        full["Change"] = "="
    
    full.to_csv(os.path.join(path, outfile))

    unbiased = unbiased.sort_values(by=['Unbiased % All Star'], ascending=False).reset_index(drop=True)

    if os.path.exists(os.path.join(path, 'unbiased_curr_player.csv')):
        temp = pd.read_csv(os.path.join(path, 'curr_player.csv'))
        temp2 = pd.read_csv(os.path.join(path, 'unbiased_curr_player.csv'))
        unbiased["Change"] = unbiased.apply(lambda x : findChange(x, temp), axis=1)
        unbiased["Daily"] = unbiased.apply(lambda x : findChange(x, temp2), axis=1)
    else:
        unbiased["Daily"] = "="
        unbiased["Change"] = "="
    
    unbiased.to_csv(os.path.join(path, "unbiased_curr_player.csv"))

    # now add to history tracker (create new col)
    today = datetime.today().strftime('%b %d, %Y')
    if not os.path.exists(os.path.join(path, 'rank_history.csv')):
        # just create it (names + todays ranking)
        hist = pd.DataFrame(zip(df["Name"], (df.index + 1)))
        hist.columns = ["Name", today]
        hist.to_csv(os.path.join(path, 'rank_history.csv'))
    else:
        hist = pd.read_csv(os.path.join(path, 'rank_history.csv'))
        ranks = {}
        for index, row in df.iterrows():
            ranks[row["Name"]] = index + 1
        hist[today] = hist["Name"].map(ranks)
        hist.drop(columns=hist.columns[0], axis=1, inplace=True) # clean up hanging index col
        hist.to_csv(os.path.join(path, 'rank_history.csv'))

    if not os.path.exists(os.path.join(path, 'unbiased_rank_history.csv')):
        # just create it (names + todays ranking)
        hist = pd.DataFrame(zip(unbiased["Name"], (unbiased.index + 1)))
        hist.columns = ["Name", today]
        hist.to_csv(os.path.join(path, 'unbiased_rank_history.csv'))
    else: 
        hist = pd.read_csv(os.path.join(path, 'unbiased_rank_history.csv'))
        ranks = {}
        for index, row in unbiased.iterrows():
            ranks[row["Name"]] = index + 1
        hist[today] = hist["Name"].map(ranks)
        hist.drop(columns=hist.columns[0], axis=1, inplace=True) # clean up hanging index col
        hist.to_csv(os.path.join(path, 'unbiased_rank_history.csv'))

    df_east = df[df["Team"].isin(east)]
    df_west = df[df["Team"].isin(west)]

    df_east = df_east.sort_values(by=['% All Star'], ascending=False).iloc[:30]
    df_west = df_west.sort_values(by=['% All Star'], ascending=False).iloc[:30]

    df_east = df_east.reset_index(drop=True)
    df_west = df_west.reset_index(drop=True)

    if os.path.exists(os.path.join(path, 'east_leaders.csv')):
        temp = pd.read_csv(os.path.join(path, 'east_leaders.csv'))
        df_east["Change"] = df_east.apply(lambda x : findChange(x, temp), axis=1)

    if os.path.exists(os.path.join(path, 'west_leaders.csv')):
        temp = pd.read_csv(os.path.join(path, 'west_leaders.csv'))
        df_west["Change"] = df_west.apply(lambda x: findChange(x, temp), axis=1)

    df_east.to_csv(os.path.join(path, 'east_leaders.csv'))
    df_west.to_csv(os.path.join(path, 'west_leaders.csv'))

    print("Updated leaderboard.")
    print("     Current time is " + today + '\n')

    # Keep track of last updates to show on website
    with open(os.path.join(path, "updatelog.txt"), 'w') as f:
        f.write(today)

    return

def datascrape():
    # Get player data
    URL = "https://www.basketball-reference.com/leagues/NBA_" + curr_year + "_per_game.html"
    html = requests.get(URL)

    data = []

    soup = BeautifulSoup(html.content, "html.parser")
    content = soup.find('div', id="content")
    table_div  = content.find('div', id="all_per_game_stats")
    table_full = table_div.find('table', id="per_game_stats")
    body = table_full.find('tbody')
    player_rows = body.find_all('tr', class_=None)
    partials = body.find_all('tr', class_="partial_table")

    j = 0
    for row in player_rows:
        # Converting table row to string array
        j += 1 # keep track of index
        player = []

        all_data = row.find_all('td')
        player += [curr_year]
        for d in all_data:
            if d.find('a'):
                player += [str(d.find('a').string)]
            else:
                if d.string:
                    player += [str(d.string)]
                else:
                    player += ["0"]

        if player[3] in ["TOT", "2TM", "3TM", "4TM"]:
            # get table head value
            new_team = ""

            while (len(partials) > j) and partials[j].find("a").string == player[1]:
                new_team = partials[j].find_all('td')[2].string
                j += 1

                # Set team var to last team of season
                player[3] = new_team

        data += [player]

    df = pd.DataFrame(data)
    cols = ["Year", "Name", "Age", "Team", "Position", "Games Played", "Games Started", "MPG", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P", "2PA", "2P%", "eFG%", "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS", "Awards"]
    df.columns = cols
    df = df.drop(columns=["Awards"], axis=1)

    # Get team data for win %
    teamdata = []

    url = "https://www.basketball-reference.com/leagues/NBA_" + curr_year + "_standings.html"
    html = requests.get(url)
    soup = BeautifulSoup(html.content, "html.parser")
    content = soup.find('div', id="content")
    wrapper = content.find('div', class_="section_content")

    for conf in wrapper.find('div').find_all('div'):
        rows = conf.find_all('tr', class_="full_table")

        for row in rows:
            team = []
            team += [row.find('a').string]
                
            for stat in row.find_all('td'):
                team += [stat.string]

            teamdata += [team]

    # Need to add extra columns for prediction
    df2 = pd.DataFrame(teamdata).drop_duplicates()
    cols = ["Team", "Wins", "Losses", "Percent", "Games Back", "PPG", "OPPG", "SRS"]
    df2.columns = cols
    df2["Team"] = df2["Team"].apply(lambda x: teams[int(teams_full.index(x))])
    df2["Games"] = np.array(df2["Wins"]).astype('int') + np.array(df2["Losses"]).astype('int')

    path = os.path.dirname(os.path.dirname(os.path.realpath(__name__)))
    path = os.path.join(path, "static/data/")
    df2.to_csv(os.path.join(path, 'standings.csv'))

    path = os.path.dirname(os.path.realpath(__name__))
    allstar = pd.read_csv(os.path.join(path, 'allstarplus.csv'))
    counts = allstar["Name"].value_counts()
    df = df.dropna()

    df['Previous Times All-Star'] = df["Name"].apply(lambda x : counts[x] if x in counts else 0)
    df["Win Percent"] = df["Team"].apply(lambda x : winPercent(x, df2))
    df['PTS/FGA'] = df.apply(ptsPerFGA, axis=1)
    df["Games Played"] = df.apply(lambda x : gamesStats(x, df2, True), axis=1)
    df["Games Started"] = df.apply(lambda x : gamesStats(x, df2, False), axis=1)
                        
    print("Finished player data compilation + standings update. Now updating leaderboard")
    updateLeaderboard(df)

datascrape()