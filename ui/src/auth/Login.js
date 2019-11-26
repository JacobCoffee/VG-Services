import React, { useState } from 'react';
import axios from 'axios';
import { Button, Modal, Form, Message } from 'semantic-ui-react';
import { modalStyles } from '../styles';

function Login(props) {
  const [ loginFailed, setLoginFailed ] = useState(false);
  const [ isOpen, setIsOpen ] = useState(false);
  const [ username, setUsername ] = useState();
  const [ password, setPassword ] = useState();

  function login() {
    axios.post('/api/auth/login', {
      username,
      password
    })
    .then(result => {
      props.setUser && props.setUser(result.data);
      onClose();
    })
    .catch(err => setLoginFailed(true))
  }

  function enterSubmit(evt) {
    return evt && evt.keyCode === 13 && login();
  }

  function onClose() {
    setUsername('');
    setPassword('');
    setIsOpen(false);
    setLoginFailed(false);
  }

  return (
    <Modal open={isOpen} onClose={onClose} trigger={<Button inverted onClick={() => setIsOpen(true)}>Login</Button>} style={modalStyles} closeIcon>
      <Modal.Header style={modalStyles}>Login</Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
        <Form inverted error={loginFailed} onSubmit={() => login()} onKeyDown={(evt) => enterSubmit(evt)}>
          <Form.Field>
            <label>Username</label>
            <input placeholder='Username' value={username} onChange={(evt) => setUsername(evt.target.value)} />
          </Form.Field>
          <Form.Field type='password'>
            <label>Password</label>
            <input type='password' placeholder='Password' value={password} onChange={(evt) => setPassword(evt.target.value)} />
          </Form.Field>
          <Message
            error
            header='Invalid credentials'
            content='Check your username and password, and try again.'
          />
        </Form>
        <Button primary submit style={{ marginTop: '5px' }} className={'ui right floated primary button'} onClick={() => login()}>Submit</Button>
      <Modal.Actions>
        
      </Modal.Actions>
      </Modal.Content>
    </Modal>
  );
}

export default Login;
