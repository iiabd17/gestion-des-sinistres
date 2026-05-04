import { useState, useContext } from 'react'
import { AuthContext } from '../../../context/AuthContext'
import './SupportPage.css'


/* ── Accordion ── */
function Accordion({ title, icon, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className={`sp-accordion ${open ? 'sp-accordion--open' : ''}`}>
      <button className="sp-accordion-header" onClick={() => setOpen(o => !o)}>
        <span className="sp-accordion-icon">{icon}</span>
        <span className="sp-accordion-title">{title}</span>
        <span className="sp-accordion-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="sp-accordion-body">{children}</div>}
    </div>
  )
}

/* ── Step card ── */
function Step({ number, title, children }) {
  return (
    <div className="sp-step">
      <div className="sp-step-number">{number}</div>
      <div className="sp-step-content">
        <h4 className="sp-step-title">{title}</h4>
        <div className="sp-step-desc">{children}</div>
      </div>
    </div>
  )
}

/* ── Tip / Warning card ── */
function InfoCard({ type, children }) {
  const icons = { tip: '💡', warning: '⚠️', info: 'ℹ️', privacy: '🔒' }
  return (
    <div className={`sp-info-card sp-info-card--${type}`}>
      <span className="sp-info-icon">{icons[type] || 'ℹ️'}</span>
      <div className="sp-info-text">{children}</div>
    </div>
  )
}

/* ── Role content sections ── */

function EquipeTerrainContent() {
  return (
    <div className="sp-role-content">
      <div className="sp-role-intro">
        <h2>Guide — Équipe Terrain</h2>
        <p>Vous êtes le premier maillon de la chaîne. Votre rôle est de signaler rapidement les sinistres sur le terrain et de fournir les preuves visuelles nécessaires.</p>
      </div>

      <Accordion title="Signaler un Sinistre" icon="📋" defaultOpen>
        <Step number="1" title="Accédez à « Déclarations » → « Nouveau Sinistre »">
          <p>Depuis la barre latérale, cliquez sur <strong>Déclarations</strong> puis sur le bouton <strong>+ Signaler un Sinistre</strong>.</p>
        </Step>
        <Step number="2" title="Remplissez le formulaire de déclaration">
          <p>Sélectionnez le <strong>Site</strong> concerné (recherche par code ou nom), choisissez la <strong>Nature du sinistre</strong> (Incendie, Vol, Fibre Optique, etc.), et rédigez une <strong>description détaillée</strong> de l'incident.</p>
        </Step>
        <Step number="3" title="Ajoutez les photos du terrain">
          <p>Utilisez le bouton <strong>📷 Ajouter des photos</strong> pour uploader vos prises directement depuis l'appareil photo de votre téléphone. Les photos sont envoyées instantanément au serveur.</p>
        </Step>
        <Step number="4" title="Soumettez la déclaration">
          <p>Cliquez sur <strong>Soumettre</strong>. Le dossier est automatiquement créé avec le statut <strong>OUVERT</strong> et envoyé à l'Ingénieur pour complétion technique.</p>
        </Step>
        <InfoCard type="tip">
          <strong>Localisation automatique :</strong> Le système récupère automatiquement les coordonnées GPS du site sélectionné. Assurez-vous de choisir le bon site pour un positionnement précis.
        </InfoCard>
      </Accordion>

      <Accordion title="Suivi de vos déclarations" icon="👁️">
        <p>Depuis la page <strong>Déclarations</strong>, vous pouvez voir l'intégralité de vos déclarations passées en cliquant sur <strong>« Voir toute l'activité »</strong>.</p>
        <InfoCard type="privacy">
          <strong>Confidentialité :</strong> Vous ne voyez que vos propres déclarations. Les dossiers des autres membres de l'équipe ne sont pas accessibles depuis votre compte.
        </InfoCard>
      </Accordion>

      <Accordion title="Notifications" icon="🔔">
        <p>Vous recevez des notifications lorsque :</p>
        <ul className="sp-list">
          <li>Votre dossier change de statut (en cours d'expertise, validé, clôturé...)</li>
          <li>L'Assurance demande des compléments d'information</li>
          <li>Votre dossier est clôturé</li>
        </ul>
        <p>Consultez vos notifications via l'icône 🔔 dans la barre supérieure.</p>
      </Accordion>
    </div>
  )
}

function IngenieurContent() {
  return (
    <div className="sp-role-content">
      <div className="sp-role-intro">
        <h2>Guide — Ingénieur OTA</h2>
        <p>Votre mission est de compléter le dossier technique, évaluer les dégâts matériels, et estimer les coûts pour l'assurance.</p>
      </div>

      <Accordion title="Compléter un dossier technique" icon="📝" defaultOpen>
        <Step number="1" title="Accédez aux dossiers à compléter">
          <p>Depuis <strong>Déclarations</strong>, les dossiers en attente de votre expertise apparaissent avec le statut <strong>OUVERT</strong>. Cliquez sur un dossier pour l'ouvrir.</p>
        </Step>
        <Step number="2" title="Ajoutez les équipements impactés">
          <p>Dans la section <strong>Équipements Sinistrés</strong>, ajoutez chaque équipement touché avec sa marque, quantité et valeur comptable.</p>
        </Step>
        <Step number="3" title="Renseignez le montant estimé">
          <p>Dans <strong>Estimation Financière</strong>, saisissez le montant total estimé des dégâts. Ce montant sera comparé à la franchise de la nature du sinistre.</p>
        </Step>
        <Step number="4" title="Soumettez l'expertise">
          <p>Cliquez sur <strong>Soumettre l'expertise</strong>. Le dossier passe en statut <strong>EN EXPERTISE</strong> et est transmis à l'Assurance.</p>
        </Step>
        <InfoCard type="warning">
          <strong>Alerte valeur suspecte :</strong> Si le montant estimé des équipements est anormalement élevé par rapport aux valeurs de référence en base de données, le système vous avertira. Vérifiez vos saisies avant de soumettre.
        </InfoCard>
      </Accordion>

      <Accordion title="Informations du Déclarant" icon="👤">
        <p>La section <strong>Informations du Déclarant</strong> affiche les données de la personne ayant créé le dossier (nom, téléphone, département).</p>
        <InfoCard type="info">
          <strong>Lecture seule :</strong> Ces informations sont en lecture seule pour garantir l'intégrité des données. Seul le déclarant original ou l'Assurance peut les modifier.
        </InfoCard>
      </Accordion>

      <Accordion title="Gestion des comptes Équipe Terrain" icon="👥">
        <p>En tant qu'Ingénieur, vous avez accès à la page <strong>Paramètres → Comptes</strong> pour :</p>
        <ul className="sp-list">
          <li>Créer de nouveaux comptes <strong>Équipe Terrain</strong></li>
          <li>Réinitialiser leurs mots de passe (🔑)</li>
          <li>Activer/Désactiver leurs comptes</li>
        </ul>
        <InfoCard type="privacy">
          <strong>Restriction :</strong> Vous ne pouvez créer et gérer que des comptes Équipe Terrain. La gestion des autres rôles est réservée à l'Assurance et aux Administrateurs.
        </InfoCard>
      </Accordion>

      <Accordion title="Fibre Optique — Champ spécial" icon="🔗">
        <p>Pour les dossiers de nature <strong>Fibre Optique</strong>, un champ supplémentaire apparaît :</p>
        <ul className="sp-list">
          <li><strong>Heure de Réparation :</strong> Indiquez l'heure estimée pour la réparation de la fibre.</li>
        </ul>
        <p>Ce champ est spécifique et n'apparaît que pour cette nature de sinistre.</p>
      </Accordion>
    </div>
  )
}

function LegalHseContent() {
  return (
    <div className="sp-role-content">
      <div className="sp-role-intro">
        <h2>Guide — Service Légal & HSE</h2>
        <p>Votre intervention est cruciale pour valider la conformité juridique et sécuritaire des dossiers avant leur transmission à l'assureur.</p>
      </div>

      <Accordion title="Service Légal — PV de Police (VOL / SABOTAGE)" icon="📄" defaultOpen>
        <Step number="1" title="Accédez au dossier en validation légale">
          <p>Les dossiers de nature <strong>Vol</strong> ou <strong>Acte de Sabotage</strong> vous sont automatiquement transmis après validation par l'Assurance. Statut : <strong>EN VALIDATION LÉGALE</strong>.</p>
        </Step>
        <Step number="2" title="Saisissez le numéro du PV de Police">
          <p>Dans le champ <strong>NUMÉRO DU PV</strong>, entrez le numéro officiel du procès-verbal (ex: PV-2026-00123).</p>
        </Step>
        <Step number="3" title="Validation automatique">
          <p>Dès que vous sauvegardez le numéro du PV, le système valide automatiquement le dossier et le transfère au statut <strong>VALIDÉ</strong>.</p>
        </Step>
        <InfoCard type="warning">
          <strong>Obligatoire :</strong> Le numéro du PV de Police est obligatoire pour les dossiers de Vol et Sabotage. Sans ce numéro, le dossier ne peut pas avancer dans le workflow.
        </InfoCard>
      </Accordion>

      <Accordion title="Service HSE — Rapport d'expertise (INCENDIE)" icon="🔥">
        <Step number="1" title="Accédez au dossier en validation HSE">
          <p>Les dossiers de nature <strong>Incendie</strong> vous sont transmis après validation par l'Assurance. Statut : <strong>EN VALIDATION HSE</strong>.</p>
        </Step>
        <Step number="2" title="Uploadez le rapport HSE">
          <p>Dans la section <strong>Documents joints</strong>, uploadez votre rapport d'expertise HSE via le bouton <strong>Ajouter un fichier</strong>.</p>
        </Step>
        <Step number="3" title="Validation automatique">
          <p>L'upload du rapport déclenche automatiquement la validation du dossier. Le statut passe à <strong>VALIDÉ</strong> et l'Assurance est notifiée.</p>
        </Step>
        <InfoCard type="tip">
          <strong>Formats acceptés :</strong> PDF, images (JPG, PNG), documents Word. Privilégiez le PDF pour les rapports officiels.
        </InfoCard>
      </Accordion>

      <Accordion title="Périmètre d'accès" icon="🔐">
        <p>Votre accès est limité aux dossiers correspondant à votre domaine :</p>
        <ul className="sp-list">
          <li><strong>Légal :</strong> Dossiers de type Vol, Acte de Sabotage</li>
          <li><strong>HSE :</strong> Dossiers de type Incendie, Catastrophe Naturelle, Intempérie, Violence Politique</li>
        </ul>
        <InfoCard type="info">
          Vous avez accès en lecture aux autres informations du dossier (détails techniques, équipements), mais seuls vos champs spécifiques sont modifiables.
        </InfoCard>
      </Accordion>
    </div>
  )
}

function AssuranceContent() {
  return (
    <div className="sp-role-content">
      <div className="sp-role-intro">
        <h2>Guide — Service Assurance</h2>
        <p>Vous êtes le chef d'orchestre du processus. Vous validez, rejetez, et transmettez les dossiers à l'assureur externe.</p>
      </div>

      <Accordion title="Tableau de Bord & KPIs" icon="📊" defaultOpen>
        <p>Votre <strong>Dashboard</strong> affiche en temps réel :</p>
        <ul className="sp-list">
          <li><strong>Sinistres actifs :</strong> Nombre de dossiers en cours de traitement</li>
          <li><strong>Sinistres clôturés :</strong> Dossiers terminés sur la période</li>
          <li><strong>Sous Franchise :</strong> Dossiers dont le montant est inférieur au seuil</li>
          <li><strong>Répartition par nature :</strong> Graphique visuel de la distribution</li>
          <li><strong>Délais moyens :</strong> Temps de traitement par étape du workflow</li>
        </ul>
        <InfoCard type="tip">
          Utilisez la page <strong>Analyse Délais</strong> dans la barre latérale pour des statistiques détaillées et des filtres avancés par période et nature.
        </InfoCard>
      </Accordion>

      <Accordion title="Validation d'un dossier" icon="✅">
        <Step number="1" title="Examinez le dossier complet">
          <p>Depuis <strong>Gestion des Dossiers</strong>, ouvrez un dossier en statut <strong>EN EXPERTISE</strong>. Vérifiez les informations du déclarant, les détails techniques, les équipements et les photos.</p>
        </Step>
        <Step number="2" title="Validez ou Mettez en Attente">
          <p><strong>Valider :</strong> Le système vérifie automatiquement la franchise :</p>
          <ul className="sp-list">
            <li>Si le montant est <strong>sous la franchise</strong> → Le dossier passe en <strong>Attente de Clôture Sous Franchise</strong></li>
            <li>Si le montant est <strong>au-dessus</strong> → Le dossier est routé selon sa nature (Légal, HSE, ou directement Validé)</li>
          </ul>
          <p><strong>Mettre en attente :</strong> Le dossier est renvoyé à l'Ingénieur pour complément d'information. C'est la boucle <strong>« Rejet pour Complément »</strong>.</p>
        </Step>
        <Step number="3" title="Clôture et Archivage">
          <p>Une fois le dossier <strong>VALIDÉ</strong>, cliquez sur <strong>Clôturer</strong> pour finaliser. Ensuite, utilisez <strong>Archiver</strong> pour le classer définitivement.</p>
        </Step>
        <InfoCard type="info">
          <strong>Sous Franchise :</strong> Si le montant estimé est inférieur à la franchise configurée, vous pouvez directement clôturer le dossier via le bouton <strong>Valider Clôture</strong> (bouton rouge).
        </InfoCard>
      </Accordion>

      <Accordion title="Mise en Attente pour Complément" icon="🔄">
        <p>Ce mécanisme permet de renvoyer un dossier incomplet à l'Ingénieur :</p>
        <Step number="1" title="Choisissez « Mettre en attente »">
          <p>Sélectionnez l'action <strong>METTRE EN ATTENTE</strong> et rédigez un motif clair expliquant les informations manquantes.</p>
        </Step>
        <Step number="2" title="L'ingénieur corrige">
          <p>L'Ingénieur reçoit une notification, corrige le dossier, et le re-soumet.</p>
        </Step>
        <Step number="3" title="Re-validation">
          <p>Le dossier revient dans votre file d'attente en statut <strong>EN EXPERTISE</strong> pour une nouvelle vérification.</p>
        </Step>
      </Accordion>

      <Accordion title="Gestion des Paramètres" icon="⚙️">
        <p>En tant que Directrice Assurance, vous avez accès complet aux <strong>Paramètres</strong> :</p>
        <ul className="sp-list">
          <li><strong>Sites :</strong> Ajouter, supprimer, importer/exporter des sites</li>
          <li><strong>Comptes :</strong> Créer des utilisateurs, changer les mots de passe, activer/désactiver</li>
          <li><strong>Franchises :</strong> Définir les seuils de franchise par nature de sinistre</li>
          <li><strong>Équipements :</strong> Gérer le catalogue global d'équipements</li>
        </ul>
        <InfoCard type="privacy">
          <strong>Note :</strong> Les Agents Assurance ont les mêmes droits de validation que la Directrice, mais n'ont pas accès à la page Paramètres.
        </InfoCard>
      </Accordion>
    </div>
  )
}

/* ── Main Component ── */
const CONTENT_MAP = {
  EQUIPE_TERRAIN: EquipeTerrainContent,
  INGENIEUR: IngenieurContent,
  LEGAL: LegalHseContent,
  HSE: LegalHseContent,
  ASSURANCE: AssuranceContent,
  ADMIN: AssuranceContent,
}

const ROLE_LABELS = {
  EQUIPE_TERRAIN: { label: 'Équipe Terrain', icon: '📡' },
  INGENIEUR:      { label: 'Ingénieur OTA',  icon: '🔧' },
  LEGAL:          { label: 'Service Légal',   icon: '⚖️' },
  HSE:            { label: 'Service HSE',     icon: '🛡️' },
  ASSURANCE:      { label: 'Service Assurance', icon: '🛡️' },
  ADMIN:          { label: 'Administrateur',  icon: '⚙️' },
}

export default function SupportPage() {
  const { user } = useContext(AuthContext)
  const role = user?.role || 'EQUIPE_TERRAIN'
  const ContentComponent = CONTENT_MAP[role] || EquipeTerrainContent
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.EQUIPE_TERRAIN

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div className="sp-header-content">
          <div className="sp-header-icon">{roleInfo.icon}</div>
          <h1 className="sp-header-title">{roleInfo.label}</h1>
        </div>
      </header>

      <main className="sp-content">
        <ContentComponent />
      </main>
    </div>
  )
}

