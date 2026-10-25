# BOBALAB 2-Player Game Design Doc (Human/AI)

##Goal/Idea
- Testing “direct recommendations” from AI vs “process oriented advice”
- We compare direct action advice, which recommends what an agent should do, with process-oriented advice, which guides when agents should seek, verify, or share information before acting. The model highlights a central tradeoff: action advice can substitute for human information acquisition, while process advice can preserve or redirect such effort when local information remains valuable.

## Two players work under one organization
- Individual roles, incentivized to maximize their “branch” goals
 - E.x production vs marketing (internal vs consumer-facing)
- Test each of them under the advice structures
- Player score is a combination of their own incentive score and the overall score
- Metrics
- Player scores (for player 1 and 2)
  - Increase at a rate proportional to  the deviation between what is optimal incentive for a certain player and what the company cumulatively chooses for a certain value
- Reduces by fixed value if share information for each decision
- overall company profit 
- Simulated from each decision 
- Company’s history of decisions/profits

## Static Variables
- List of company descriptions which each game randomly loads into one condition
- List of all the decisions and strictly numerical choices (how much of X to produce, how many to hire, how much to spend on marketing)
- Company variables for:
- How much items cost
- CAC 
- Hiring costs
… etc all variables for managing a company
- Private information will be a select of these data points based on role


## Game Flow

### Setup
- Each player joins game, and is randomly assigned to either marketing or production
- Each player gets some information about their role, the company, and the rules of the game

### Gameplay
- Series of “decisions”
- Decision is what a company should do at a certain point based on available information 
- AI recommendation (pick randomly between direct and process-oriented)
- Before receiving private information, player chooses either:
- Cooperate (small cost): information is shared 
- Individual: private information 
- Private information gets revealed to each player
- Each player independently chooses an action e.x an amount of something
- Profit from decision calculated (see metrics)

### Design Structure 

- Stack: Empirica, React.js app 
- server/
- Node.js server storing/syncing data for each of the metrics above for each game
client/
- App.jsx main page: loading and setting up
- Component for recommendations using AI API (leave this as placeholder for now)
- Game.jsx → gameplay
- shared/
- constants.js
- rules.js
