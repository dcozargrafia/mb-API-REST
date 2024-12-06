CREATE DATABASE PruebaMB01;
USE PruebaMB01;

CREATE TABLE bookMakers(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('regular', 'exchange')),
    comission NUMERIC NOT NULL CHECK (comission >= 0 AND comission <= 100),
    initialBalance NUMERIC NOT NULL DEFAULT 0,
    info VARCHAR(500)
);

CREATE TABLE bets(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    betDate DATE NOT NULL ,
    idBookMaker INTEGER NOT NULL,
    bank VARCHAR(20) NOT NULL CHECK (bank IN ('real', 'freebet')),
    betType VARCHAR(20) NOT NULL CHECK (betType IN ('backBet', 'layBet', 'mugBet', 'freeBet', 'personal', 'other')),
    eventDate DATE NOT NULL,
    event VARCHAR(200) NOT NULL,
    bet VARCHAR(200) NOT NULL,
    stake NUMERIC NOT NULL CHECK (stake > 0),
    odds NUMERIC NOT NULL CHECK (odds > 1),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'won', 'lost')),
    liability NUMERIC NOT NULL,
    result NUMERIC NOT NULL,
    idMB INTEGER NOT NULL,
    promo VARCHAR(100),
    info VARCHAR(500),
    FOREIGN KEY (idBookMaker) REFERENCES bookMakers(id)
);

CREATE TABLE transactions(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL ,
    idBookMaker INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    info VARCHAR(500),
    FOREIGN KEY (idBookMaker) REFERENCES bookMakers(id)
);

CREATE TABLE freebets(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    idBookMaker INTEGER NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('freebet-on-win', 'freebet-on-loss', 'bet-and-get', 'loyalty', 'other')),
    amount NUMERIC,
    event VARCHAR(200) NOT NULL,
    bet VARCHAR(200),
    requirements VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'pending', 'rejected', 'claiming', 'other')),
    FOREIGN KEY (idBookMaker) REFERENCES bookMakers(id)
);

SELECT * FROM bookMakers;

SELECT * FROM bets;

SELECT * FROM transactions;

SELECT * FROM freebets;