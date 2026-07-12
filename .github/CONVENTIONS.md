AWAC MONO Development Conventions
Project Overview

AWAC MONO (Awards des Couturier.e.s du Mono) est une plateforme de gestion complète d'un concours de couture.

Le projet comporte deux parties :

Site vitrine (déjà terminé)
Plateforme d'administration (à développer)

Le site vitrine est considéré comme stable.

Copilot ne doit jamais modifier son design sans demande explicite.

Technical Stack
Vue 3
Vite
Composition API
Tailwind CSS
Pinia
Vue Router
Supabase
PostgreSQL
Existing Website

Les composants suivants existent déjà :

Navbar
Hero
Works
Vote
Prix
Footer

Ils représentent la charte graphique officielle.

Toujours réutiliser leurs couleurs, animations, espacements et composants.

Ne jamais les remplacer.

Project Architecture

Créer progressivement l'architecture suivante.

src/

components/

layouts/

pages/

router/

stores/

services/

composables/

utils/

types/

Supabase

supabase/

migrations/

functions/

storage/

policies/

views/

triggers/

seed/

docs/
Development Rules

Toujours écrire un code modulaire.

Éviter les composants gigantesques.

Réutiliser les composants existants.

Écrire des fonctions courtes.

Documenter les parties complexes.

Utiliser la Composition API.

Préférer les Composables pour la logique métier.

Préférer les Services pour les appels Supabase.

Ne jamais mettre directement les requêtes Supabase dans les composants Vue.

Roles

Le système comporte quatre profils.

Administrator

Contrôle total.

Moderator

Gestion des candidats.

Création des étapes.

Gestion des jurys.

Aucun accès aux paramètres sensibles.

Jury Member

Connexion par pseudo.

Peut uniquement noter.

Ne peut jamais modifier une note validée.

Jury President

Est également un jury.

Peut noter.

Peut voir la progression des membres de son groupe.

Peut clôturer la phase de son groupe.

Jury Groups

Chaque jury appartient à un groupe.

Chaque groupe possède exactement un président.

Le président est un membre du groupe.

Candidates

Chaque candidat possède :

identité
photo
photo de la création
atelier
commune
téléphone
sexe
catégorie
votes
scores
classement

Les classements Homme et Femme sont indépendants.

Competition Rules

Le concours comporte plusieurs étapes.

Chaque étape possède :

un pourcentage
un formulaire dynamique

La somme des pourcentages doit toujours être égale à 100%.

Dynamic Forms

Les formulaires ressemblent à Google Forms.

Types disponibles :

note numérique
curseur
case à cocher
texte court
commentaire
suggestion obligatoire
Voting

Le Mobile Money n'est pas encore intégré.

Les votes sont simulés.

Le système doit être conçu pour permettre l'intégration future de MTN, Moov et Celtis sans modifier la logique métier.

Certificates

Deux modèles :

Participation

Mérite

Les attestations de mérite sont bloquées tant que le concours n'est pas clôturé.

Security

Utiliser les Row Level Security.

Créer des permissions strictes.

Les jurys ne peuvent jamais modifier leurs notes.

Les modérateurs ne voient jamais les signatures officielles.

Toutes les actions importantes doivent être enregistrées dans les logs.

Coding Standards

Toujours privilégier :

lisibilité
modularité
composants réutilisables
noms explicites
architecture évolutive

Ne jamais créer de code dupliqué.

Toujours respecter les bonnes pratiques Vue 3 et Supabase.