import predictor
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/')
def main():
    return render_template('index.html')

@app.route('/process', methods=['POST']) 
def process(): 
    data = request.get_json()
    prediction = predictor.getPrediction(data)
    return prediction;

if __name__ == "__main__":
    app.run(debug=True)