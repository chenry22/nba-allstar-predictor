## NBA All-Star Predictor

This project involves using Python datascraping to predict future NBA All-Stars based on their current season statistics. Using modern NBA data from the past several years, I developed a logistic regression model to make predictions given any arbitrary input.

#### Repo Layout
- **[/datascraper](/datascraper/)** - Scripts used to gather all historical NBA data and build + test the predicton model
  - **[datascraper.py](/datascraper/datascraper.py)** - Main script which conducts all datascraping and trains the model on the data collected
  - **[predictor.py](/datascraper/predictor.py)** - Basic script that loads predictor model and produces a prediction based on appropriate input
- **[/web app](/web%20app/)** - The Flask app that handles the website functionality
  - **[/dailscraper/dailyscrape.py](/web%20app/dailyscraper/dailyscrape.py)** - Script which handles gathering all player data from current season up to the current date
  - **[/static](/web%20app/static/)** - All the website stuff, CSV files, JS functions, CSS styling
  - **[/templates](/web%20app/templates/)** - All the HTML pages
  - **[app.py](/web%20app/app.py)** - The flask app backend that connects everything

### Current Site
You can visit the current version of the website using [this link](http://ch22.pythonanywhere.com)! The website's data is updated daily at 10am EST.

Right now the main feature is taking user input and returning some prediction. You can see both the percentage likelihood determined by the model and the binary prediction. Currently the model has an established threshold of 75% to declare a player an all-star, which was most accurate based on testing.

The website also maintains a list of NBA players that have played during the current season, with their statistics and all-star probability. There is a full leaderboard and an all-star leaderboard, which splits players by conference to project actual lineupss.

### Goals / Features to Add
- [x] Track weekly changes in leaderboard predictions
- [ ] Show when request is loading
- [ ] Team logos (draw them myself or copyright free versions)
- [x] Player dropdown shows last game
- [ ] Search by biggest risers / fallers (above some threshold, like we probably don't care about someone who is +36 but changed from 0.001 to 0.003)
- [ ] Make website look nicer (CSS and style updgrades) (colors + fonts)
  - [ ] Colors for main table ? maybe

### Known Issues
- [x] Older versions of pickle save data may be corrupt/only work with 'sklearn' imports of version 0.24.1 or lower
  - Any current commits should not have this problem; was an issue of a syntax changing from 'sklearn.linear_model.logistic' to 'sklearn.linear_model._logistic' in newer versions
- [x] Older versions have issue where a null value is discarded when it should be a meaningful zero (specifically relating to player shot percentages when attempts were zero).
  - Current commits should not have this problem; was an issue of parsing data where a 'null' placeholder was stored when it should have been a "0" string.

For any found issues, please create a GitHub post to notify me!

### Code Use
Feel free to use any of the code written for your own projects or as a baseline to build off of! I would appreciate some credit though :)