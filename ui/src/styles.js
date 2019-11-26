import React from 'react';
import { Image } from 'semantic-ui-react'

const CLASS_ICON_HEIGHT = 64;
const CLASS_ICON_WIDTH = 64;

function ClassIconImage({ source, selected, selectedClass, ...rest }) {
  if(source) {
    return (<Image
      src={source}
      className={selected ? selectedClass : ''}
      style={{
        width: CLASS_ICON_WIDTH / 1.5,
        height: CLASS_ICON_HEIGHT / 1.5,
        display: 'inline-block'
      }}
      {...rest}
    />);
  } else {
    return (<Image
      style={{
        width: CLASS_ICON_WIDTH / 1.5,
        height: CLASS_ICON_HEIGHT / 1.5,
        display: 'inline-block'
      }}
    />);
  }
}

export const modalStyles = {
  color: 'silver',
  backgroundColor: '#242124',
  borderColor: '#242124'
};

export const wowClasses = {
  druid: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/druid.png')} />,
    bgColor: '#FF7D0A',
    bgColorRGBA: alpha => `rgba(255,125,10,${alpha})`
  },
  hunter: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/hunter.png')} />,
    bgColor: '#A9D271',
    bgColorRGBA: alpha => `rgba(169,210,113,${alpha})`
  },
  mage: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/mage.png')} />,
    bgColor: '#40C7EB',
    bgColorRGBA: alpha => `rgba(64,199,235,${alpha})`
  },
  paladin: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/paladin.png')} />,
    bgColor: '#F58CBA',
    bgColorRGBA: alpha => `rgba(245,140,186,${alpha})`
  },
  priest: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/priest.png')} />,
    bgColor: '#FFFFFF',
    bgColorRGBA: alpha => `rgba(255,255,255,${alpha})`
  },
  rogue: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/rogue.png')} />,
    bgColor: '#FFF569',
    bgColorRGBA: alpha => `rgba(255,245,105,${alpha})`
  },
  warlock: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/warlock.png')} />,
    bgColor: '#8787ED',
    bgColorRGBA: alpha => `rgba(135,135,237,${alpha})`
  },
  warrior: {
    icon: (props) => <ClassIconImage {...props} source={require('./assets/class_icons/warrior.png')} />,
    bgColor: '#C79C6E',
    bgColorRGBA: alpha => `rgba(199,156,110,${alpha})`
  }
};

export const unknownClass = {
  icon: (props) => <ClassIconImage {...props} source={''} />,
  bgColor: '#000',
  bgColorRGBA: alpha => `rgba(0,0,0,${alpha})`
};
