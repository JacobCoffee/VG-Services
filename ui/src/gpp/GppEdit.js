import React, { useState } from 'react';
import axios from 'axios';
import { Button, Dropdown, Icon, Modal, Form, Message } from 'semantic-ui-react';
import { modalStyles } from '../styles';
import { cloneDeep } from 'lodash-es';
import { eventTypeOptions, lootEventTypeOptions } from '../util/event_types';
import DatePicker from "react-datepicker";
import GuildSearch from '../components/GuildSearch';

function GppEdit(props) {
  const [ editFailed, setEditFailed ] = useState(false);
  const [ isOpen, setIsOpen ] = useState(false);
  const [ eventData, setEventData ] = useState(null);

  const { guild=[], raids=[], playerEvent={} } = props;
  // If we have an existing object, we are editing, not adding
  const isEdit = !!playerEvent.raid_id;

  function submit() {
    isEdit ? submitEdit() : submitAdd()
  }

  function submitEdit() {
    axios.put(`/api/player_events/${playerEvent.id}`, eventData)
    .then(result => {
      props.handler && props.handler(result.data)
      onClose();
    })
    .catch(err => setEditFailed(extractError(err.response)))
  }

  function submitAdd() {
    axios.post('/api/player_events', eventData)
    .then(result => {
      props.handler && props.handler(result.data)
      onClose();
    })
    .catch(err => setEditFailed(extractError(err.response)))
  }

  function extractError(response) {
    return (response && response.data && response.data.message) || 'Unknown error occurred';
  }

  // Sets a value on the event_data object
  function setFormInnerValue(field, value) {
    setFormValue('event_data', {
      ...eventData.event_data,
      [field]: value
    });
  }

  function setFormValue(field, value) {
    // React needs a "new" object to detect the state change
    setEventData({
      ...eventData,
      [field]: value
    });
  }

  // Raid event timestamps are in seconds, Date times are in millis
  // Need to convert Date millis to seconds
  function setRaidTimeFromDate(date) {
    const raidTime = date.getTime() / 1000;
    setFormInnerValue('time', raidTime)
  }

  function onClose() {
    setEventData(null);
    setIsOpen(false);
    setEditFailed(false);
  }

  // FIXME: Lots of copying and pasting here, since React insists on re-rendering form fields even when keyed
  const eventDataEditors = {
    RAID_LOOT: () => (
      <React.Fragment key='RAID_LOOT'>
        <Form.Field>
          <label>Time</label>
          <DatePicker selected={eventData.event_data.time * 1000} onChange={setRaidTimeFromDate} showTimeSelect dateFormat='Pp' />
        </Form.Field>
        <Form.Field>
          <label>GPP Base Cost</label>
          <input type='number' placeholder='GPP' value={eventData.event_data.amount} onChange={(evt) => setFormInnerValue('amount', evt.target.value)} />
        </Form.Field>
        <Form.Field>
          <label>Item Name</label>
          <input placeholder='Item Name' value={eventData.event_data.name} onChange={(evt) => setFormInnerValue('name', evt.target.value)} />
        </Form.Field>
        <Form.Field>
          <label>Item ID</label>
          <input placeholder='Item ID' value={eventData.event_data.item_id} onChange={(evt) => setFormInnerValue('item_id', evt.target.value)} />
        </Form.Field>
        <Form.Field>
          <label>Action</label>
          <Dropdown placeholder='Action' fluid selection defaultValue={eventData.event_data.action} options={lootEventTypeOptions} onChange={(evt, { key, value }) => setFormInnerValue('action', value)} />
        </Form.Field>
      </React.Fragment>
    ),
    RAID_ON_TIME: () => (
      <React.Fragment key='RAID_ON_TIME'>
        <Form.Field>
          <label>Time</label>
          <DatePicker selected={eventData.event_data.time * 1000} onChange={setRaidTimeFromDate} showTimeSelect dateFormat='Pp' />
        </Form.Field>
        <Form.Field>
          <label>Time</label>
          <DatePicker selected={eventData.event_data.time * 1000} onChange={setRaidTimeFromDate} showTimeSelect dateFormat='Pp' />
        </Form.Field>
      </React.Fragment>
    ),
    RAID_PRESENCE: () => (
      <React.Fragment key='RAID_PRESENCE'>
        <Form.Field>
          <label>Time</label>
          <DatePicker selected={eventData.event_data.time * 1000} onChange={setRaidTimeFromDate} showTimeSelect dateFormat='Pp' />
        </Form.Field>
        <Form.Field type='number'>
          <label>Total Seconds</label>
          <input type='number' placeholder='Total Seconds' value={eventData.event_data.total_seconds} onChange={(evt) => setFormInnerValue('total_seconds', evt.target.value)} />
        </Form.Field>
      </React.Fragment>
    ),
    RAID_FULL_DURATION: () => (
      <React.Fragment key='RAID_FULL_DURATION'>
        <Form.Field>
          <label>Time</label>
          <DatePicker selected={eventData.event_data.time * 1000} onChange={setRaidTimeFromDate} showTimeSelect dateFormat='Pp' />
        </Form.Field>
        <Form.Field type='number'>
          <label>Presence Seconds</label>
          <input type='number' placeholder='Presence Seconds' value={eventData.event_data.presence_seconds} onChange={(evt) => setFormInnerValue('presence_seconds', evt.target.value)} />
        </Form.Field>
        <Form.Field type='number'>
          <label>Raid Duration Seconds</label>
          <input type='number' placeholder='Raid Duration Seconds' value={eventData.event_data.raid_duration_seconds} onChange={(evt) => setFormInnerValue('raid_duration_seconds', evt.target.value)} />
        </Form.Field>
      </React.Fragment>
    ),
    RAID_BOSS: () => (
      <React.Fragment key='RAID_BOSS'>
        <Form.Field>
          <label>Time</label>
          <DatePicker selected={eventData.event_data.time * 1000} onChange={setRaidTimeFromDate} showTimeSelect dateFormat='Pp' />
        </Form.Field>
        <Form.Field>
          <label>Boss Name</label>
          <input placeholder='Boss Name' value={eventData.event_data.name} onChange={(evt) => setFormInnerValue('name', evt.target.value)} />
        </Form.Field>
      </React.Fragment>
    )
  };

  const modeText = isEdit ? 'Edit' : 'Add';

  // Create an inital form data set using a clone of the current event, or an empty event
  if(!eventData) {
    const dataObj = playerEvent ? cloneDeep(playerEvent) : {}
    dataObj.event_data = dataObj.event_data || {};
    setEventData(dataObj);
    return null;
  }

  if(!raids) { return null; }

  const raidIds = raids.map(it => it.raid_id);
  const raidIdOptions = raidIds.map(it => ({
    key: it,
    text: it,
    value: it
  }));

  const eventDataEditor = eventDataEditors[eventData.event_type];
  const trigger = props.icon ?
    <Icon name='edit' style={{ cursor: 'pointer' }} onClick={() => setIsOpen(true)} /> :
    <Button inverted onClick={() => setIsOpen(true)}>{modeText} GPP Event</Button>;

  return (
    <Modal open={isOpen} onClose={onClose} trigger={trigger} style={modalStyles} closeIcon>
      <Modal.Header style={modalStyles}>{modeText} GPP Event</Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
      <Form inverted error={editFailed}>
        <Form.Field>
          <label>Raid Id</label>
          <Dropdown placeholder='Raid ID' fluid selection defaultValue={eventData.raid_id} options={raidIdOptions} onChange={(evt, { key, value }) => setFormValue('raid_id', value)} />
        </Form.Field>
        <Form.Field>
          <label>Player Name</label>
          <GuildSearch
            guild={guild}
            value={eventData.player_name}
            onChange={(player_name) => setFormValue('player_name', player_name)}
          />
        </Form.Field>
        <Form.Field type='number'>
          <label>GPP Change (negative, if spending)</label>
          <input type='number' placeholder='GPP Change' value={eventData.gpp} onChange={(evt) => setFormValue('gpp', evt.target.value)} />
        </Form.Field>
        <Form.Field>
          <label>Event Type</label>
          <Dropdown placeholder='Event Type' fluid selection defaultValue={eventData.event_type} options={eventTypeOptions} onChange={(evt, { key, value }) => setFormValue('event_type', value)} />
        </Form.Field>
         { eventDataEditor ? eventDataEditor() : null }
        <Message
          error
          header='Error saving player event'
          content={`Errors: ${editFailed}`}
        />
      </Form>
      <Modal.Actions>
        <Button style={{ marginTop: '5px' }} className={'ui right floated primary button'} onClick={() => submit()}>Submit</Button>
      </Modal.Actions>
      </Modal.Content>
    </Modal>
  );
}

export default GppEdit;
