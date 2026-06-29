import { Link } from "react-router-dom"

const Home = () => {
  return (
    <main>
      <h1>Home</h1>
      <p>Home page</p>
      <Link to="/task">Task</Link>
      <br />
      <Link to="/task/upload">Upload Task</Link>
    </main>
  )
}

export default Home
