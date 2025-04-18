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
        $mail->setFrom('communicationestrappes@gmail.com', 'Xonics Contact'); // Ton email Gmail
        $mail->addReplyTo($email, $nom);                    // L'email de l'utilisateur pour répondre
        $mail->addAddress('communicationestrappes@gmail.com');    // Ton adresse où tu veux recevoir les messages

        $mail->isHTML(false);                               // Envoyer un email en format texte
        $mail->Subject = "Nouveau message de contact";
        $mail->Body    = "Nom:      $nom\nEmail:      $email\nThematique:      $subject\nMessage:      \n\n     $message";

        // ENVOYER LE MESSAGE
        $mail->send();
        echo "Votre message a bien été envoyé.";
    } catch (Exception $e) {
        echo "Erreur lors de l'envoi du message : {$mail->ErrorInfo}";
    }
}
?>


