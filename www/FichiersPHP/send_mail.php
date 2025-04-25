<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Récupérer les données du formulaire
    $nom = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $subject = htmlspecialchars($_POST["subject"]);
    $message = htmlspecialchars($_POST["message"]);

    // Créer une nouvelle instance de PHPMailer
    $mail = new PHPMailer(true);

    try {
        // CONFIGURATION DU SERVEUR SMTP
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com'; // Serveur SMTP (Gmail, Outlook, etc.)
        $mail->SMTPAuth = true;
        $mail->Username = 'communicationestrappes@gmail.com'; // Remplacez par votre e-mail
        $mail->Password = 'shnf jtwo xaya jvgl'; // Remplacez par votre mot de passe
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;                                  // Port SMTP pour TLS

        // CONFIGURATION DE L'EMAIL        
        $mail->setFrom('communicationestrappes@gmail.com', 'es Trappes');
        $mail->addReplyTo($email, $nom);                    // L'email de l'utilisateur pour répondre
        $mail->addAddress('communicationestrappes@gmail.com');    // Ton adresse où tu veux recevoir les messages


        
        $mail->CharSet = 'UTF-8';
        $mail->isHTML(true);  // Active le format HTML pour le corps du mail

        // Sujet de l'email
        $mail->Subject = "Nouveau message de contact";

        // Corps de l'email avec du HTML et du CSS pour améliorer l'apparence
        $mail->Body = "
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                color: #333333;
                line-height: 1.6;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            h2 {
                color: #007BFF;
            }
            p {
                font-size: 14px;
            }
            .details {
                margin-top: 20px;
                background-color: #ffffff;
                padding: 15px;
                border-radius: 5px;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            }
            .details p {
                margin: 5px 0;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #777;
                margin-top: 30px;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <h2>Vous avez reçu un nouveau message de contact</h2>
            <div class='details'>
                <p><strong>Nom :</strong> $nom</p>
                <p><strong>Email :</strong> $email</p>
                <p><strong>Thématique :</strong> $subject</p>
                <p><strong>Message :</strong><br> $message</p>
            </div>
            <div class='footer'>
                <p>Ce message a été envoyé via votre formulaire de contact.</p>
            </div>
        </div>
    </body>
    </html>
";

        // ENVOYER LE MESSAGE
        $mail->send();
        echo "Votre message a bien été envoyé.";
    } catch (Exception $e) {
        echo "Erreur lors de l'envoi du message : {$mail->ErrorInfo}";
    }
}