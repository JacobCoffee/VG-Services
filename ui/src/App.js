import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import "react-datepicker/dist/react-datepicker.css";

import { Container } from 'semantic-ui-react';

import Gpp from './gpp/Gpp';
import GppEdit from './gpp/GppEdit';
import Login from './auth/Login';
import Logout from './auth/Logout';
import AllRaids from './raid/AllRaids';
import RaidUpload from './raid/RaidUpload';

import { isLoggedIn, isOfficer } from './util/auth';

function App() {
  const [ guild, setGuild ] = useState(null);
  const [ raids, setRaids ] = useState(null);
  const [ user, setUser ] = useState({});

  // If in a modal, and one closes the modal, the tooltips remain
  function closeShittyClassicDBTooltips(evt) {
    if(evt.keyCode === 27) {
      document.querySelectorAll('.tooltip').forEach(el => el.style.visibility = 'hidden');
      document.querySelectorAll('.tooltip > p').forEach(el => el.style.visibility = 'hidden');
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', closeShittyClassicDBTooltips, false);

    return () => {
      document.removeEventListener('keydown', closeShittyClassicDBTooltips, false);
    };
  }, []);

  useEffect(() => {
    axios(
      '/api/guild',
    ).then(result => setGuild(result.data));
  }, []);

  useEffect(() => {
    axios(
      '/api/raids',
    ).then(result => setRaids(result.data));
  }, []);

  if(!raids || !guild) {
    return null;
  }

  return (
    <Container textAlign='center' style={{ height: '100vh', marginTop: 10 }} verticalAlign='middle'>
      {/* User: {user.username} {user.roles} */}
      { isLoggedIn() ? <Logout setUser={setUser} /> : <Login setUser={setUser} /> }
      { isOfficer() ? <RaidUpload /> : null }
      <AllRaids raids={raids} />
      { isOfficer() ? <GppEdit guild={guild} raids={raids} /> : null }
      <Gpp guild={guild} raids={raids} showEdit={isOfficer()} />
    </Container>
  );
}

export default App;
