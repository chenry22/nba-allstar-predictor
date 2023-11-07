import pickle
from sklearn.linear_model import LogisticRegression
import pandas as pd

filename = "allstar_model.sav"
log_model = pickle.load(open(filename, 'rb'))


features = ['Games Played', 'Games Started', 'MPG', 'FG', 'FGA',
            '3P', '3PA', '2P', '2PA', 'FT',
            'FTA', 'ORB', 'DRB', 'TRB', 'AST',
            'STL', 'BLK', 'PTS', 'TOV', 'Previous Times All-Star',
            'Win Percent', 'PTS/FGA']
in_vect = [70,70,30,10,20,
           0,1,10,19,0,
           0,0,3,3,8,
           1,2,20,2,5,
           0.5,1]

in_df = pd.DataFrame(in_vect).T
in_df.columns = features

print(log_model.predict_proba(in_df)[0])
print(log_model.predict(in_df))

def index(req):
        postData = req.form
        return postData;