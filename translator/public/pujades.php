<?php
if(isset($_POST['key'])){
    if($_POST['key'] == "687f06bbe779d591fc38b4956d1906e2"){
        $retornat = '';
        chdir($_POST['dir']);
        exec("git pull ".$_POST['pull']."", $result);
        foreach ($result as $line) {
            $retornat = $retornat."<li>".$line."</li>";
        }
        
        echo "<ul>".$retornat."</ul>";
    } else {
        echo "KEY no valida!";
    }
} else {
    echo "Methodo y KEY no valida!";
}