import pickle
from sklearn.linear_model import LogisticRegression
import pandas as pd
import numpy as np

filename = "allstar_model.sav"
log_model = pickle.load(open(filename, 'rb'))
thrs = 0.75 # change threshold here

def getPrediction(arr_in): 
    features = ['Games Played', 'Games Started', 'MPG', 'FG', 'FGA',
                '3P', '3PA', '2P', '2PA', 'FT',
                'FTA', 'ORB', 'DRB', 'TRB', 'AST',
                'STL', 'BLK', 'PTS', 'TOV', 'Previous Times All-Star',
                'Win Percent', 'PTS/FGA']

    in_vect = np.array(arr_in)

    print(in_vect)
    in_vect = in_vect[: len(features)]
    in_df = pd.DataFrame(in_vect).T
    in_df.columns = features

    prob = log_model.predict_proba(in_df)[0]
    str_out = ""

    if prob[1] > thrs:
        str_out = "All-Star."
    else:
        str_out = "Not All-Star."

    ret = {
        "prob" : (str(round(prob[1] * 100, 2)) + "%"),
        "decision" : str_out
    }

    return ret
