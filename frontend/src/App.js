import './App.css';
import { Route,Switch } from 'react-router-dom';
import { Homepage } from './pages/Homepage';
import {Chatpage} from './pages/Chatpage'
function App() {
  return (
    <div className="App">
    <Switch>
    <Route path='/' component={Homepage} exact></Route>
    <Route path='/chats' component={Chatpage}></Route>
    </Switch>
    </div>
  );
}

export default App;
