# HELPER LIB.S

from bs4 import BeautifulSoup
import requests
import pandas as pd
import time
import os.path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

import pickle

# CONST.S

curr_year = 2023
baseURL = "https://www.basketball-reference.com/"

teams = ["TOT", "ATL", "BOS", "BRK", "CHO", "CHI", "CLE", "DET", "IND", "MIA", 
         "MIL", "NYK", "ORL", "PHI", "TOR", "WAS", "DAL", "DEN", "GSW", "HOU", 
         "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHO", "POR", "SAC", "SAS", "UTA"]

teams_full = ["n/a", "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", 
              "Chicago Bulls", "Cleveland Cavaliers", "Detroit Pistons", "Indiana Pacers", "Miami Heat", 
              "Milwaukee Bucks", "New York Knicks", "Orlando Magic", "Philadelphia 76ers", "Toronto Raptors", 
              "Washington Wizards", "Dallas Mavericks", "Denver Nuggets", "Golden State Warriors", "Houston Rockets",
              "Los Angeles Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Minnesota Timberwolves", "New Orleans Pelicans",
              "Oklahoma City Thunder", "Phoenix Suns", "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Utah Jazz"]

positions = ["extra so num.s look nicer", "PG", "SG" ,"SF", "PF", "C"]

team_pct_dict = {}

dict = {}

# HELPER FUNCTIONS 

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

        meta = soup.find('div', id="info")
        meta = meta.find('div', id="meta")
        name = meta.find('h1')
        name = name.find('span').string.encode('utf-8')
        print(name)

        player_data += [name]
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

    cols = ["Name", "All-Star Year", "Age", "Team", "League", "Position", "Games Played", "Games Started", "MPG", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P", "2PA", "2P%", "eFG%", "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS"]

    df = pd.DataFrame(final_player_data)
    df.columns = cols
    df.to_csv(outfile)
    print("Finished Data Compilation. Storing in " + outfile)

def get_player_data(start_year=2010, outfile="playerdata.csv"):
    data = []
    curr = curr_year
    years = []

    while curr >= start_year:
        years += [str(curr)]
        curr -= 1

    for year in years:
        url = str("https://www.basketball-reference.com/leagues/NBA_" + year + "_per_game.html")

        html = requests.get(url)

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
            player += [str(year)]
            for d in all_data:
                if d.find('a'):
                    player += [str(d.find('a').string.encode('utf-8'))]
                else:
                    if d.string:
                        player += [str(d.string.encode('utf-8'))]
                    else:
                        player += []

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
                player[4] = new_team.encode('utf-8')
            
            # Accounting for table breaks counting as headers (only happen
            # every 20 players though)
            if int(row.find('th').string) % 20 == 0:
                    i += 1 

            data += [player]

        print(year + " player data collected")
        time.sleep(3)

    df = pd.DataFrame(data)
    cols = ["Year", "Name", "Position", "Age", "Team", "Games Played", "Games Started", "MPG", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P", "2PA", "2P%", "eFG%", "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS"]

    df.columns = cols
    df.to_csv(outfile)
    print("Finished Data Compilation. Storing in " + outfile)

def get_prev_appearances(x):
    if counts[x] > 0:
        counts[x] -= 1
        return counts[x] + 1
    else:
        return 0

def get_prev(x):
    if x in dict:
        dict[x] = dict[x] - 1
        if dict[x] < 0:
            dict.pop(x)
            return 0
        else:
            return dict[x] + 1
    else:
        return 0

def filter_player_data():
    # filter out all stars from mass player data

    df = pd.read_csv("allstarplus.csv")
    df2 = pd.read_csv("playerdata.csv")

    dict.clear()
    for a, b in zip(df['Name'], df['Previous Times All-Star']):
        if not a in dict :
            dict[a] = b

    df2["Previous Times All-Star"] = df2["Name"].apply(get_prev)
    df2["Is All-Star"] = False

    for i in df.index:
        temp = df2[(df["Name"][i] == df2["Name"]) & (df["All-Star Year"][i] == df2["Year"])]
        if not temp.empty:
            print("Marking " + str(df["Name"][i]) + " All-Star for year " + str(df["All-Star Year"][i]))
            df2["Is All-Star"][temp.index] = True

    # filtering out random new column made that is silly
    df2.drop(columns=df2.columns[0], axis=1, inplace=True)
    df2.to_csv("filteredplayerdata.csv")

def numerate_team(x):
    if x in teams:
        return int(teams.index(x))
    
    if x == "NJN":
        return int(teams.index("BRK"))
    
    if x == "NOH":
        return int(teams.index("NOP"))
    
    if x == "CHA":
        return int(teams.index("CHO"))
    
    print("NUMERATE ERR: " + x)

def numerate_full_team(x):
    if x in teams_full:
        return int(teams_full.index(x))

    if x == "New Jersey Nets":
        return int(teams.index("BRK"))
    
    if x == "New Orleans Hornets":
        return int(teams.index("NOP"))
    
    if x == "Charlotte Bobcats":
        return int(teams.index("CHO"))

    print("TEAM NUMERATE ERROR: " + x)

def get_team_stats(start_year = 2010, outfile = "teamdata.csv"):
    data = []
    curr = curr_year
    years = []

    while curr >= start_year:
        years += [str(curr)]
        curr -= 1

    for year in years:
        url = str("https://www.basketball-reference.com/leagues/NBA_" + year + "_standings.html")

        html = requests.get(url)

        soup = BeautifulSoup(html.content, "html.parser")
        content = soup.find('div', id="content")
        wrapper = content.find('div', class_="section_content")

        for conf in wrapper.find('div').find_all('div'):
            rows = conf.find_all('tr', class_="full_table")

            for row in rows:
                team = []
                team += [year]
                team += [row.find('a').string.encode('utf-8')]
                
                for stat in row.find_all('td'):
                    team += [stat.string.encode('utf-8')]

                data += [team]

        print(year + " team data collected")
        time.sleep(3)

    df = pd.DataFrame(data)
    cols = ["Year", "Team", "Wins", "Losses", "Percent", "Games Back", "PPG", "OPPG", "SRS"]
    df.columns = cols
    df.to_csv(outfile)
    print("Finished compiling team data.")

def match_win_pct(df):
    ret = []

    for team, yr in zip(df["Team"], df["Year"]):
        key = str(yr) + "-" + str(team)

        # weird error w/ trailing 0
        key = key.split('.')[0]

        if not team == 0:
            ret += [team_pct_dict[key]]
        else:
            ret += ["Mult"]

    return ret

# MAIN CODE

print("Checking all-star datapath")
if not os.path.isfile("allstarplus.csv"):
    print("     All-star data file NOT found. Creating manually using original data")
    checkfile = "allstar.csv"

    if os.path.isfile(checkfile):
        print("    Data file found! Reading to dataframe.")
    else:
        print("     Data file not found. Creating manually using datascraper.")
        print("     (This could take a while due to website restrictions...)")
        get_all_star_data(years_back=20)

    df = pd.read_csv(checkfile)
    if not 'Previous Times All-Star' in df.columns:
        # for each year, check if previous all star
        counts = df["Name"].value_counts()
        counts = counts - 1

        df['Previous Times All-Star'] = df["Name"].apply(get_prev_appearances)

    if not 'First Appearance' in df.columns:
        df['First Appearance'] = df['Previous Times All-Star'].apply(lambda x : x == 0)

    df.drop(columns=df.columns[0], axis=1, inplace=True)
    df.to_csv("allstarplus.csv")

else:
    print("     All-star data file found.")

print("\nChecking for mass player datapath")
if not os.path.isfile("playerdata.csv"):
    print("     No player data file found.")
    if not os.path.isfile("filteredplayerdata.csv"):
        print("     Gathering mass player data")
        get_player_data()
    else:
        print("     Found filtered player instead data")
else:
    print("     Mass player data found.")

print("\nChecking data filtered")
if not os.path.isfile("filteredplayerdata.csv") and os.path.isfile("playerdata.csv"):
    print("     Unfiltered data -> Filtering out All-Stars")
    filter_player_data()
else:
    print("     Data already filtered.")

print("\nChecking team datapath")
if not os.path.isfile("teamdata.csv"):
    print("     Compiling team stats relevant.")
    get_team_stats()
else:
    print("     Team data found.")

# now real data stuff.
# First we need to make sure each player has an associated win percent
df = pd.read_csv("teamdata.csv")
df["Team"] = df["Team"].apply(numerate_full_team)
df.drop(columns=df.columns[0], axis=1, inplace=True)

team_pct_dict = {}
for year, team, pct in zip(df["Year"], df["Team"], df["Percent"]):
    key = str(year) + "-" + str(team)
    team_pct_dict[key] = round(pct, 3)

# Now we should make each column numerical for analysis
df = pd.read_csv("filteredplayerdata.csv")
df["Team"] = df["Team"].apply(numerate_team)
df["Position"] = df["Position"].apply(lambda x: positions.index(str(x).split('-')[0]))
df["Win Percent"] = match_win_pct(df)

# clean up dataframe
df.drop(columns=df.columns[0], axis=1, inplace=True)
# clean up null vals (few in terms of overall dataset size, so we're chilling)
df = df.dropna()

# After looking at initial correlations, lets change our data
# a bit to better reflect each statistic

# Converting TOV value to AST to TOV ratio instead
df['AST/TOV'] = df.apply(lambda x: x['TOV'] if x['TOV'] <= 0 else x['AST']/x['TOV'], axis=1)

# Creating new column describing efficiency
df['PTS/FGA'] = df.apply(lambda x: x['FGA'] if x['FGA'] <= 0 else x['PTS']/x['FGA'], axis=1)

# Lets clean up our data and drop any irrelevant data
df = df.drop(columns=["Year", "Name"], axis=1)

corrs = zip(df.columns, np.array(df.corr().round(3)["Is All-Star"]))

# print("ALL STAR CORRELATIONS VS STATS")
# for corr in corrs:
#     print(corr)

# from these correlations we can get our list of relevant features
features = ['Games Played', 'Games Started', 'MPG', 'FG', 'FGA',
            '3P', '3PA', '2P', '2PA', 'FT',
            'FTA', 'ORB', 'DRB', 'TRB', 'AST',
            'STL', 'BLK', 'PTS', 'TOV', 'Previous Times All-Star',
            'Win Percent', 'PTS/FGA']
target = "Is All-Star"

X = df[features]
y = df[target]

X_train,X_test,y_train,y_test = train_test_split(X, y, test_size=0.2, random_state=30, stratify=y)

# specify solver
log_model = LogisticRegression(solver='liblinear')
log_model.fit(X_train, y_train)

filename = 'allstar_model.sav'
pickle.dump(log_model, open(filename, 'wb'))