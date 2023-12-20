## NBA All-Star Predictor

This project involves using Python datascraping in order to predict future NBA All-Stars based on their current season statistics. Using modern NBA data from the past few years, we have developed a logistic regression model to make predictions from new input.

### Current Site
You can visit the current version of the website right now using [this link](http://ch22.pythonanywhere.com).

Right now the website simply takes in basic user input, sends the data to the model and returns a prediction. You are able to see both the percentage likelihood determined by the model and the binary prediction. Currently the model has an established threshold of 75%, which proved most realistic during testing.

### Future Goals
- [ ] Create a prediction leaderboard which shows the most likely predictions from the current season (for both conferences modeling the potential all-star game)
- [ ] Track daily or weekly changes in leaderboard predictions
  - Will probably end up being daily just for storage limitations
- [ ] Make website look nicer (CSS and style updgrades)

### Completed Goals
- [x] Create a basic lookup table where users can search player statistics from the current season instead of having to manually input them
- [x] Implement an automated system to scrape and update current season statistics daily

### Known Issues
- [x] Older versions of pickle save data may be corrupt/only work with 'sklearn' imports of version 0.24.1 or lower
  - Any current commits should not have this problem; was an issue of a syntax changing from 'sklearn.linear_model.logistic' to 'sklearn.linear_model._logistic' in newer versions
- [x] Older versions have issue where a null value is discarded when it should be a meaningful zero (specifically relating to player shot percentages when attempts were zero).
  - Current commits should not have this problem; was an issue of parsing data where a 'null' placeholder was stored when it should have been a "0" string.


For any found issues, please create a GitHub post to notify me!

### Code Use
The code from this project is probably not very good! I am pretty new to all this so any feedback or suggestions is much appreciated. That being said, feel free to use any of the code written for your own projects or as a baseline to build off of! 