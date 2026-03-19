import { colors } from "../styles/theme.js";

const red = colors.red;
const darkText = colors.darkText;

// Northstar "N" icon — two parallelogram shapes from brand
export const NorthstarIcon = ({ size = 32, color = red }) => (
  <svg width={size} height={size} viewBox="0 0 163 162" fill="none">
    <polygon points="7.2,10 7.2,135.7 68.9,135.7 68.9,63.9" fill={color}/>
    <polygon points="152.2,152.2 152.2,26.5 90.6,26.5 90.6,98.3" fill={color}/>
  </svg>
);

// Northstar wordmark — geometric letter paths from brand SVG
export const NorthstarWordmark = ({ height = 20, color = darkText }) => (
  <svg height={height} viewBox="0 0 499.5 72" fill="none">
    <path d="M17,8v7l22.7,22.7V8h8.4V66h-8.4V48.8L17,26.1V66H8.6V8L17,8L17,8z" fill={color}/>
    <path d="M66.4,26c0-12.3,7-18.9,20-18.9s20,6.6,20,18.9v22c0,12.4-7,19-20,19s-20-6.6-20-19V26z M74.8,47.9c0,7.5,4.1,11.6,11.6,11.6C94,59.6,98,55.5,98,47.9V26c0-7.5-4-11.6-11.6-11.6c-7.5,0-11.6,4.1-11.6,11.6V47.9z" fill={color}/>
    <path d="M124.5,8h21.6c11.9,0,18.3,6.1,18.3,17.3c0,9.8-4.9,15.7-14.2,17l13.9,13.9V66h-8.4v-7l-16.5-16.5h-6.5V66h-8.4V8L124.5,8z M132.9,35.3h13.3c6.5,0,10-3.6,10-10c0-6.5-3.5-10-10-10h-13.3V35.3L132.9,35.3z" fill={color}/>
    <path d="M175.3,15.1V8h43.5v7.1h-17.6V66h-8.5V15.1H175.3z" fill={color}/>
    <path d="M243.7,8v25h22.7V8h8.4V66h-8.4V40h-22.7v26h-8.4V8H243.7z" fill={color}/>
    <path d="M301,47.7c0,7.7,4.5,11.9,12.9,11.9c7.2,0,11.1-3.1,11.1-8.9c0-16-31.2-4-31.2-27.4c0-10.5,6.3-16.3,18.2-16.3c12.8,0,19.7,6.7,19.7,19.2h-7.9c0-7.7-4.1-11.9-11.9-11.9c-6.5,0-10,3-10,8.5c0,15.8,31.2,3.8,31.2,27.2c0,10.9-6.7,16.8-19.3,16.8c-13.4,0-20.6-6.7-20.6-19.2L301,47.7L301,47.7z" fill={color}/>
    <path d="M342.1,15.1V8h43.5v7.1H368V66h-8.5V15.1H342.1L342.1,15.1z" fill={color}/>
    <path d="M454.4,8h21.6c11.9,0,18.3,6.1,18.3,17.3c0,9.8-4.9,15.7-14.2,17l13.9,13.9V66h-8.4v-7l-16.5-16.5h-6.5V66h-8.4L454.4,8L454.4,8z M462.8,35.3h13.3c6.5,0,10-3.6,10-10c0-6.5-3.5-10-10-10h-13.3V35.3L462.8,35.3z" fill={color}/>
    <polygon points="418.7,7.6 414,7.6 397,24.6 397,66 405.4,66 405.4,27.4 416.3,16.4 427.3,27.4 427.3,66 435.7,66 435.7,24.6" fill={color}/>
  </svg>
);
