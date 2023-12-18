import pickle
import pandas as pd
import numpy as np

from sklearn.linear_model import LogisticRegression

from flask import Flask, render_template, request
import os

app = Flask(__name__)

basedir = os.path.abspath(os.path.dirname(__file__))
model_save = os.path.join(basedir, 'web app/static/allstar_model.sav')
daily_stats = os.path.join(basedir, 'web app/dailyscraper/current_stats.csv')

def getPrediction(arr_in): 
    log_model = pickle.load(open(model_save, 'rb'))

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

    str_out = "";
    thrs = 0.75

    if prob[1] > thrs:
        str_out = "All-Star."
    else:
        str_out = "Not All-Star."

    ret = {
        "prob" : (str(round(prob[1] * 100, 2)) + "%"),
        "decision" : str_out
    }

    return ret

@app.route('/')
def main():
    return render_template('index.html')

@app.route('/process', methods=['POST']) 
def process(): 
    data = request.get_json()
    prediction = getPrediction(data)
    return prediction;



if __name__ == "__main__":
    app.run()