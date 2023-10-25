from bs4 import BeautifulSoup
import requests
import pandas as pd
import time
import os.path

curr_year = 2023
baseURL = "https://www.basketball-reference.com/"
teams = ["TOT", "ATL", "BOS", "BRK", "CHO", "CHI", "CLE", "DET", "IND", "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS", "DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHO", "POR", "SAC", "SAS", "UTA"]

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
        rows = body.find_all('tr', class_="full_table")

        for row in rows:
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

def filter_player_data():
    # filter out all stars from mass player data

    df = pd.read_csv("allstar.csv")

    df2 = pd.read_csv("playerdata.csv")
    for i in df.index:
        df2 = df2.drop(df2[(df2["Name"] == df["Name"][i]) & (df2["Year"] == df["All-Star Year"][i])].index)

    # filtering out random new column made that is silly
    df2.drop(columns=df2.columns[0], axis=1, inplace=True)

    df2.to_csv("playerdata.csv")

def get_team_id(x):
    if x in teams:
        return teams.index(x)
    
    if x == "NJN":
        return teams.index("BRK")
    
    if x == "NOH":
        return teams.index("NOP")

if not os.path.isfile("allstarplus.csv"):
    print("Extended data file NOT found. Creating manually using original data")
    checkfile = "allstar.csv"

    if os.path.isfile(checkfile):
        print("Data file found! Reading to dataframe.")
    else:
        print("Data file not found. Creating manually using datascraper.")
        print("(This could take a while due to website restrictions...)")
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
    print("Extended data file found.")

if not os.path.isfile("playerdata.csv"):
    print("Gathering mass player data")
    if not os.path.isfile("filteredplayerdata.csv"):
        get_player_data()
else:
    print("Mass player data found.")

if not os.path.isfile("filteredplayerdata.csv") and os.path.isfile("playerdata.csv"):
    print("Unfiltered data -> Filtering out All-Stars")
    filter_player_data()
else:
    print("Data already filtered.")


# now real data stuff.
df = pd.read_csv("allstarplus.csv")

df = df.drop(columns=["League"])
df["Team"] = df["Team"].apply(get_team_id)