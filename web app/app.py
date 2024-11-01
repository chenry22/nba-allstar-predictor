import pickle
import pandas as pd
import numpy as np

from flask import Flask, render_template, request, send_from_directory
import os

app = Flask(__name__)

basedir = os.path.abspath(os.path.dirname(__file__))
# model_save = os.path.join(basedir, 'static/allstar_model.sav')
daily_stats = os.path.join(basedir, 'dailyscraper/current_stats.csv')

# define model globally
log_model = pickle.load(open(os.path.join(basedir, 'static/allstar_model.sav'), 'rb'))
thrs = 0.75

def getPrediction(arr_in): 
    features = ['Games Played', 'Games Started', 'MPG', 'FG', 'FGA',
                '3P', '3PA', '2P', '2PA', 'FT',
                'FTA', 'ORB', 'DRB', 'TRB', 'AST',
                'STL', 'BLK', 'PTS', 'TOV', 'Previous Times All-Star',
                'Win Percent', 'PTS/FGA']

    in_vect = np.array(arr_in)
    in_vect = in_vect[: len(features)]
    in_df = pd.DataFrame(in_vect).T
    in_df.columns = features

    prob = log_model.predict_proba(in_df)[0];

    if (float(in_df['MPG'][0]) < 10):
        prob[1] = 0

    ret = {
        "prob" : (str(round(prob[1] * 100, 2)) + "%"),
        "decision" : "All-Star." if prob[1] > thrs else  "Not All-Star."
    }

    return ret

@app.route('/', methods = ['GET', 'POST'])
def main():
    f = open(os.path.join(basedir, "static/data/updatelog.txt"), 'r')
    timelog = f.readline()
    return render_template('index.html', timelog=timelog)

@app.route('/process', methods=['POST']) 
def process(): 
    data = request.get_json()
    prediction = getPrediction(data)
    return prediction

@app.route('/static/data/<filename>')
def get_file(filename):
    print("Requesting data " + filename)
    return send_from_directory('static/data/', filename)

@app.route('/leaderboard', methods = ['GET', 'POST'])
def get_leaderboard():
    f = open(os.path.join(basedir, "static/data/updatelog.txt"), 'r')
    timelog = f.readline()
    return render_template('leaderboard.html', timelog=timelog)

@app.route('/about', methods=['GET', 'POST'])
def get_about():
    return render_template('about.html')

@app.route('/fulltable', methods = ['GET', 'POST'])
def get_fulltable():
    f = open(os.path.join(basedir, "static/data/updatelog.txt"), 'r')
    timelog = f.readline()
    return render_template('fulltable.html', timelog=timelog)

@app.route('/standings', methods = ['GET', 'POST'])
def get_standings():
    f = open(os.path.join(basedir, "static/data/updatelog.txt"), 'r')
    timelog = f.readline()
    return render_template('standings.html', timelog=timelog)

if __name__ == "__main__":
    app.run()