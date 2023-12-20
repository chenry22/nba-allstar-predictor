from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import requests
import os
import pickle

from datetime import datetime, timedelta
from threading import Timer

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

class RepeatTimer(Timer):
    def run(self):
        while not self.finished.wait(self.interval):
            self.function(*self.args, **self.kwargs)

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
            print(x)
            return 0
    else:
        series = (82 - games) + int(x["Games Started"])
        if len(series) > 0:
            return series.iloc[0]
        else:
            print(x)
            return 0

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
    predictions = predictions * 100
    predictions = np.round(predictions, decimals=2)
  
    full = df
    full["% All Star"] = predictions
    full = full.sort_values(by=['% All Star'], ascending=False)

    path = os.path.dirname(os.path.dirname(os.path.realpath(__name__)))
    path = os.path.join(path, "static/data/")
    full.reset_index(drop=True).to_csv(os.path.join(path, outfile))

    df_east = df[df["Team"].isin(east)]
    df_west = df[df["Team"].isin(west)]

    df_east = df_east.sort_values(by=['% All Star'], ascending=False).iloc[:20]
    df_west = df_west.sort_values(by=['% All Star'], ascending=False).iloc[:20]

    df_east.reset_index(drop=True).to_csv(os.path.join(path, 'east_leaders.csv'))
    df_west.reset_index(drop=True).to_csv(os.path.join(path, 'west_leaders.csv'))

    print("Updated leaderboard.")
    print("Current time is " + datetime.today().strftime('%Y-%m-%d %H:%M:%S') + '\n')

    # Keep track of last updates to show on website
    with open(os.path.join(path, "updatelog.txt"), 'w') as f:
        f.write(datetime.today().strftime('%Y-%m-%d %H:%M:%S'))

    return

def datascrape(outfile='curr_player.csv'):
    # Get player data
    URL = "https://www.basketball-reference.com/leagues/NBA_2024_per_game.html"
    html = requests.get(URL)

    data = []

    soup = BeautifulSoup(html.content, "html.parser")
    content = soup.find('div', id="content")
    table_div  = content.find('div', id="all_per_game_stats")
    table_full = table_div.find('table', id="per_game_stats")
    body = table_full.find('tbody')
    player_rows = body.find_all('tr', class_="full_table")
    all_rows = body.find_all('tr')

    i = 0
    for row in player_rows:
        # Keeping track of current row for all rows
        # in case of mult. team
        i += 1

        # Converting table row to string array
        player = []

        all_data = row.find_all('td')
        player += [str('2024')]
        for d in all_data:
            if d.find('a'):
                player += [str(d.find('a').string)]
            else:
                if d.string:
                    player += [str(d.string)]
                else:
                    player += ["0"]

        if player[4] == "TOT":
            # get table head value
            check = row.find('th')
            new_team = ""

            while (len(all_rows) > i) & (all_rows[i].find('th') is not None) & (all_rows[i].find('th') == check):
                new_team = all_rows[i].find_all('td')[3].string
                i += 1

                # python doesn't have early termination for some reason
                if len(all_rows) <= i:
                    break

            # Set team var to last team of season
            player[4] = new_team
            
        # Accounting for table breaks counting as headers (only happen
        # every 20 players though)
        if int(row.find('th').string) % 20 == 0:
                i += 1 

        data += [player]

    df = pd.DataFrame(data)
    cols = ["Year", "Name", "Position", "Age", "Team", "Games Played", "Games Started", "MPG", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P", "2PA", "2P%", "eFG%", "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS"]
    df.columns = cols

    # Get team data for win %
    teamdata = []

    url = "https://www.basketball-reference.com/leagues/NBA_2024_standings.html"
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

    path = os.path.dirname(os.path.realpath(__name__))
    allstar = pd.read_csv(os.path.join(path, 'allstarplus.csv'))
    counts = allstar["Name"].value_counts()
    df = df.dropna()

    df['Previous Times All-Star'] = df["Name"].apply(lambda x : counts[x] if x in counts else 0)
    df["Win Percent"] = df["Team"].apply(lambda x : winPercent(x, df2))
    df['PTS/FGA'] = df.apply(ptsPerFGA, axis=1)
    df["Games Played"] = df.apply(lambda x : gamesStats(x, df2, True), axis=1)
    df["Games Started"] = df.apply(lambda x : gamesStats(x, df2, False), axis=1)
                                   
    print("Finished player data compilation. Now updating leaderboard")

    # create leaderboard as well
    updateLeaderboard(df)

# Taken from https://stackoverflow.com/questions/15088037/python-script-to-do-something-at-the-same-time-every-day
def daily(func=datascrape):
    x=datetime.today()

    # We will update every day at 10am
    y = x.replace(day=x.day, hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
    y = x.replace(day=x.day, hour=x.hour, minute=x.minute, second=x.second, microsecond=0) + timedelta(seconds=10)
    delta_t=y-x

    secs=delta_t.total_seconds()

    # t = Timer(secs, func)
    t = RepeatTimer(secs, func)
    t.start()

# Just need one call to initialize system
datascrape()
daily(datascrape)