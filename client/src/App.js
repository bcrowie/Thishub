import React, { createContext } from "react";
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Utils } from './utils/utils'
import Nav from './components/Nav/Nav'
import PostList from './components/Posts/PostList'
import PostNav from './components/Nav/PostNav/PostNav'
import Register from './components/Register/Register'
import "./App.scss";

export const UserContext = createContext()

const App = () => {
  const auth = Utils.Users.useAuthentication()

  return (
    <Router>
      <UserContext.Provider value={auth}>
        <Route path='/'>
          <Nav />
          <PostNav />
          <div className="main-container">
            <Route path='/'>
              <PostList />
            </Route>
            <Route path="/my-account">
              <p>MyAccount page</p>
            </Route>
          </div>
        </Route>
      </UserContext.Provider>
      <Route path='/register'>
        <Register />
      </Route>
    </Router>
  );
}

export default App;