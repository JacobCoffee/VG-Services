import React from 'react';
import { Button } from 'semantic-ui-react';

import { logout } from '../util/auth';

function Logout(props) {
  function logoutAndRemoveUser() {
    logout();
    props.setUser && props.setUser(null);
  }

  return (
    <Button inverted onClick={() => logoutAndRemoveUser()}>Logout</Button>
  );
}

export default Logout;
