import { BrowserRouter, Route, Switch } from "react-router-dom";
import Header from "./components/Header";
import Main from "./components/Main";
import Footer from "./components/Footer";

function App() {
    return (
        <BrowserRouter>
            <div>
                <Header />
                <main>
                    <Switch>
                        <Route exact path="/" component={Main} />
                    </Switch>
                </main>
                <Footer />
            </div>
        </BrowserRouter>
    );
}

export default App;