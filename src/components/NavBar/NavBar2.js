import React from 'react'
const styles = {
    navContainer: {
        padding: '20px',
        color: 'red',
        background: 'blue',
        borderRadius: '10px',
        boxShadow: '0 0 10px',
        marginLeft: '15px',
        marginRight: '15px',
        marginTop: '10px',
        
},
};

const NavBar2 = () => {
return (
    <div style= {styles.navContainer}>
        <h2>NavBar</h2>
    <header>
       <ul>
        <li>Home</li>
        <li>DC</li>
        <li>MARVEL</li>
        <li>Series</li>
       </ul>
    </header>
    </div>
 )

}

export default NavBar2;